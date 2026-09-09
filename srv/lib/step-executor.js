'use strict';

// ─────────────────────────────────────────────────────────────────
//  Step executor — pure business logic, no cds/req dependency
//  beyond what's passed in. Kept separate from rules-service.js
//  so the service file stays a thin hook-wiring layer.
// ─────────────────────────────────────────────────────────────────

/**
 * Executes a single merged step (see mergeStepsForExecution below).
 * step.stepType tags which sub-object (step.approval, step.checkCondition,
 * etc.) holds the type-specific data — this mirrors the shape the old
 * polymorphic RuleSteps row used to have, so this function is otherwise
 * unchanged from the pre-flatten version.
 */
async function executeStep (step, context) {
  switch (step.stepType) {

    // ── APPROVAL ────────────────────────────────────────────────
    case 'APPROVAL': {
      const ap     = step.approval;
      const amount = Number(getNestedValue(context, ap?.amountField) ?? 0);

      const sorted = (ap?.levels || [])
        .sort((a, b) => a.levelOrder - b.levelOrder)
        .filter(l => amount > Number(l.ifAmountExceeds));

      const matchedLevel = sorted[sorted.length - 1] ?? null;

      const subject = resolveTokens(ap?.emailSubject || '', context);
      const body    = resolveTokens(ap?.emailBody    || '', context);

      return {
        output: {
          amount,
          currency:       ap?.currency,
          matchedLevel:   matchedLevel?.levelLabel ?? 'No approval required',
          approverEmail:  matchedLevel?.approverEmail ?? null,
          cc:             ap?.cc,
          emailSubject:   subject,
          emailBody:      body,
          note: matchedLevel
            ? `Approval required from ${matchedLevel.levelLabel} (${matchedLevel.approverEmail})`
            : 'Amount below all thresholds — auto-approved',
        }
      };
    }

    // ── CHECK CONDITION ─────────────────────────────────────────
    case 'CHECK_CONDITION': {
      const conditions = step.checkCondition?.conditions || [];
      for (const cond of conditions.sort((a, b) => a.rowOrder - b.rowOrder)) {
        const actual = getNestedValue(context, cond.attribute);
        console.log(`[CHECK_CONDITION] attribute: "${cond.attribute}" | actual: "${actual}" | operator: ${cond.operator} | expected: "${cond.value}"`);
        if (!evaluateCondition(actual, cond.operator, cond.value)) {
          console.log(`[CHECK_CONDITION] ✗ FAILED on "${cond.attribute}"`);
          return { passed: false, output: { failed: cond.attribute, operator: cond.operator, expected: cond.value, actual } };
        }
      }
      return { output: { allConditionsPassed: true } };
    }

    // ── SET VARIABLES ───────────────────────────────────────────
    case 'SET_VARIABLES': {
      const contextUpdates = {};
      (step.setVariables?.variables || [])
        .sort((a, b) => a.rowOrder - b.rowOrder)
        .forEach(v => {
          if (!v.keys) {
            console.warn(`[SET_VARIABLES] ⚠ Row ${v.rowOrder} has no key — skipping`);
            return;
          }
          const resolvedValue = resolveTokens(v.value || '', context);
          contextUpdates[v.keys] = resolvedValue;
          console.log(`[SET_VARIABLES] Row ${v.rowOrder}: "${v.keys}" = "${resolvedValue}"`);
        });
      console.log(`[SET_VARIABLES] contextUpdates:`, JSON.stringify(contextUpdates));
      return { contextUpdates, output: contextUpdates };
    }

    // ── API MAPPING ─────────────────────────────────────────────
    case 'API_MAPPING': {
      const am = step.apiMapping;
      return {
        output: {
          note:        'API_MAPPING – call via BTP Destination Service',
          destination: am?.destination,
          method:      am?.method,
          url:         am?.serviceUrl,
        }
      };
    }

    // ── AI MAPPING ──────────────────────────────────────────────
    case 'AI_MAPPING': {
      const aim = step.aiMapping;
      return {
        output: {
          note:        'AI_MAPPING – submit to SAP AI Core',
          modelId:     aim?.modelId,
          prompt:      resolveTokens(aim?.prompt || '', context),
          targetField: aim?.outputField,
        }
      };
    }

    // ── FIELD MAPPING ───────────────────────────────────────────
    case 'FIELD_MAPPING': {
      const contextUpdates = {};
      const fm = step.fieldMapping;
      (fm?.fieldMappings || [])
        .sort((a, b) => a.rowOrder - b.rowOrder)
        .forEach(row => { contextUpdates[row.targetField] = context[row.sourceField] ?? null; });
      return {
        contextUpdates,
        output: {
          mappedFields:        Object.keys(contextUpdates),
          technicalComponents: (fm?.technicalComponents || [])
            .sort((a, b) => a.rowOrder - b.rowOrder)
            .map(tc => ({ function: tc.functionCds, logic: tc.programLogic })),
        }
      };
    }

    // ── CALL ACTION ─────────────────────────────────────────────
    case 'CALL_ACTION': {
      const ca = step.callAction;
      return {
        output: {
          functionCds:  ca?.functionCds  || null,
          programLogic: ca?.programLogic || null,
        }
      };
    }

    // ── CONFIGURATION ───────────────────────────────────────────
    case 'CONFIGURATION': {
      const cfg      = step.configuration;
      const keyValue = getNestedValue(context, cfg?.keyFieldSap) ?? null;

      const matchedEntry = (cfg?.entries || [])
        .find(e => String(e.keyValue) === String(keyValue)) ?? null;

      let resolvedFields = null;
      if (matchedEntry?.fieldValues) {
        try { resolvedFields = JSON.parse(matchedEntry.fieldValues); }
        catch { resolvedFields = { raw: matchedEntry.fieldValues }; }
      }

      const contextUpdates = {};
      if (cfg?.outputVariable && resolvedFields)
        contextUpdates[cfg.outputVariable] = resolvedFields;

      return {
        contextUpdates,
        output: {
          keyField:       cfg?.keyFieldSap,
          keyValue,
          outputVariable: cfg?.outputVariable,
          matched:        !!matchedEntry,
          resolvedFields,
          note: matchedEntry
            ? `Matched entry for ${cfg?.keyFieldSap}="${keyValue}" → written to payload.${cfg?.outputVariable}`
            : `No entry found for ${cfg?.keyFieldSap}="${keyValue}"`,
        }
      };
    }

    // ── TOLERANCE LIMIT ─────────────────────────────────────────
    // Currency/Source Field/Target Field come from the associated
    // ToleranceKeys master row (fixed per key). The actual limit
    // values and breach action come from the step itself (change
    // every time a rule is configured).
    case 'TOLERANCE_LIMIT': {
      const tl  = step.toleranceLimit;
      const key = tl?.toleranceKey; // expanded ToleranceKeys row

      const actualValue    = Number(getNestedValue(context, key?.checkField) ?? 0);
      const referenceValue = Number(getNestedValue(context, key?.referenceField) ?? 0);

      const variance    = actualValue - referenceValue;
      const isLower     = variance < 0;
      const absVariance = Math.abs(variance);
      const pctVariance = referenceValue !== 0
        ? (absVariance / Math.abs(referenceValue)) * 100
        : 0;

      const prefix   = isLower ? 'lower' : 'upper';
      const absLimit = tl?.[`${prefix}Amount`];
      const pctLimit = tl?.[`${prefix}Percent`];

      const absExceeded = absLimit !== undefined && absLimit !== null && absVariance > Number(absLimit);
      const pctExceeded = pctLimit !== undefined && pctLimit !== null && pctVariance > Number(pctLimit);
      const exceeded     = absExceeded || pctExceeded;

      console.log(
        `[TOLERANCE_LIMIT] key=${key?.toleranceKey} | ` +
        `actual=${actualValue} ref=${referenceValue} variance=${variance} (${pctVariance.toFixed(2)}%) | ` +
        `direction=${prefix} absExceeded=${absExceeded} pctExceeded=${pctExceeded} exceeded=${exceeded}`
      );

      return {
        passed: !(exceeded && tl?.action === 'BLOCK'),
        contextUpdates: {
          toleranceCheck: {
            toleranceKey: key?.toleranceKey,
            exceeded,
            action:       exceeded ? tl?.action : null,
            direction:    prefix,
            absExceeded,
            pctExceeded,
            variance,
            pctVariance
          }
        },
        output: {
          toleranceKey:   key?.toleranceKey,
          description:    key?.description,
          currency:       key?.currency,
          checkField:     key?.checkField,
          referenceField: key?.referenceField,
          actualValue,
          referenceValue,
          variance,
          pctVariance: Number(pctVariance.toFixed(2)),
          direction: prefix,
          absExceeded,
          pctExceeded,
          exceeded,
          action: tl?.action,
          note: exceeded
            ? `Tolerance "${key?.toleranceKey}" (${key?.description}) exceeded (${prefix} limit) → ${tl?.action}`
            : `Within tolerance "${key?.toleranceKey}" (${key?.description})`
        }
      };
    }

    default:
      throw new Error(`Unknown stepType: ${step.stepType}`);
  }
}

/**
 * Flattening replaced the single polymorphic "steps" array with 9
 * separate composition arrays on Rules (rule.checkConditionSteps,
 * rule.apiMappingSteps, ...). This merges them back into one
 * type-tagged, stepOrder-sorted array so executeStep() and the
 * getStepsByRule() function can work with a single ordered list,
 * exactly like the old RuleSteps table did.
 */
function mergeStepsForExecution (rule) {
  const typeMap = [
    ['approvalSteps',       'APPROVAL',        'approval'],
    ['checkConditionSteps', 'CHECK_CONDITION', 'checkCondition'],
    ['setVariablesSteps',   'SET_VARIABLES',   'setVariables'],
    ['apiMappingSteps',     'API_MAPPING',     'apiMapping'],
    ['aiMappingSteps',      'AI_MAPPING',      'aiMapping'],
    ['fieldMappingSteps',   'FIELD_MAPPING',   'fieldMapping'],
    ['callActionSteps',     'CALL_ACTION',     'callAction'],
    ['configurationSteps',  'CONFIGURATION',   'configuration'],
    ['toleranceLimitSteps', 'TOLERANCE_LIMIT', 'toleranceLimit'],
  ];

  const merged = [];
  for (const [compositionName, stepType, selfKey] of typeMap) {
    for (const s of (rule[compositionName] || [])) {
      merged.push({
        ID: s.ID,
        stepOrder: s.stepOrder,
        stepName: s.stepName,
        stepType,
        [selfKey]: s,
      });
    }
  }
  return merged.sort((a, b) => a.stepOrder - b.stepOrder);
}

// ── Helpers ──────────────────────────────────────────────────────

function resolveTokens (template, context) {
  return template.replace(/:([A-Za-z0-9_.]+)/g, (_, key) =>
    getNestedValue(context, key) ?? `:${key}`
  );
}

function getNestedValue (obj, path) {
  if (!path || obj === null || obj === undefined) return undefined;
  return path.split('.').reduce((acc, k) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    if (k in acc) return acc[k];
    const lowerK = k.toLowerCase();
    const matchedKey = Object.keys(acc).find(key => key.toLowerCase() === lowerK);
    return matchedKey ? acc[matchedKey] : undefined;
  }, obj);
}

function evaluateCondition (actual, operator, expected) {
  switch (operator) {
    case 'EQUALS':          return String(actual) === String(expected);
    case 'NOT_EQUALS':      return String(actual) !== String(expected);

    case 'GREATER_THAN':    return Number(actual) >  Number(expected);
    case 'GREATER_OR_EQUAL':return Number(actual) >= Number(expected);
    case 'LESS_THAN':       return Number(actual) <  Number(expected);
    case 'LESS_OR_EQUAL':   return Number(actual) <= Number(expected);

    case 'CONTAINS':        return String(actual).includes(String(expected));
    case 'NOT_CONTAINS':    return !String(actual).includes(String(expected));
    case 'STARTS_WITH':     return String(actual).startsWith(String(expected));
    case 'ENDS_WITH':       return String(actual).endsWith(String(expected));
    case 'MATCHES_REGEX': {
      try { return new RegExp(expected).test(String(actual)); }
      catch { return false; }
    }

    case 'IS_EMPTY':        return !actual || String(actual).trim() === '';
    case 'IS_NOT_EMPTY':    return !!actual && String(actual).trim() !== '';
    case 'IS_NULL':         return actual === null || actual === undefined;
    case 'IS_NOT_NULL':     return actual !== null && actual !== undefined;
    case 'RECORD_EXISTS': {
      if (Array.isArray(actual)) return actual.length > 0;
      if (actual && typeof actual === 'object') return Object.keys(actual).length > 0;
      return actual !== null && actual !== undefined && actual !== '';
    }
    case 'RECORD_NOT_EXISTS': {
      if (Array.isArray(actual)) return actual.length === 0;
      if (actual && typeof actual === 'object') return Object.keys(actual).length === 0;
      return actual === null || actual === undefined || actual === '';
    }

    case 'BETWEEN': {
      const [min, max] = String(expected).split(',').map(Number);
      const n = Number(actual);
      return n >= min && n <= max;
    }
    case 'NOT_BETWEEN': {
      const [min, max] = String(expected).split(',').map(Number);
      const n = Number(actual);
      return n < min || n > max;
    }

    case 'IN': {
      const list = String(expected).split(',').map(s => s.trim());
      return list.includes(String(actual));
    }
    case 'NOT_IN': {
      const list = String(expected).split(',').map(s => s.trim());
      return !list.includes(String(actual));
    }

    case 'BEFORE':    return new Date(actual) < new Date(expected);
    case 'AFTER':     return new Date(actual) > new Date(expected);
    case 'ON': {
      return new Date(actual).toDateString() === new Date(expected).toDateString();
    }
    case 'THIS_WEEK': {
      const now   = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      const d = new Date(actual);
      return d >= start && d <= end;
    }
    case 'THIS_MONTH': {
      const now = new Date();
      const d   = new Date(actual);
      return d.getMonth()     === now.getMonth() &&
             d.getFullYear()  === now.getFullYear();
    }
    case 'THIS_YEAR': {
      return new Date(actual).getFullYear() === new Date().getFullYear();
    }
    case 'LAST_N_DAYS': {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - Number(expected));
      cutoff.setHours(0, 0, 0, 0);
      return new Date(actual) >= cutoff;
    }
    case 'NEXT_N_DAYS': {
      const now    = new Date();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + Number(expected));
      cutoff.setHours(23, 59, 59, 999);
      return new Date(actual) >= now && new Date(actual) <= cutoff;
    }

    default:
      return false;
  }
}

module.exports = { executeStep, mergeStepsForExecution, getNestedValue, resolveTokens, evaluateCondition };