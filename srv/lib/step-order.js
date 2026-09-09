'use strict';

const cds = require('@sap/cds');

// The 9 step-type entities, in no particular order — used whenever we
// need to treat "all of a rule's steps" as one set even though they now
// live in separate tables.
function stepEntities (entities) {
  return [
    entities.ApprovalSteps,
    entities.CheckConditionSteps,
    entities.SetVariablesSteps,
    entities.ApiMappingSteps,
    entities.AiMappingSteps,
    entities.FieldMappingSteps,
    entities.CallActionSteps,
    entities.ConfigurationSteps,
    entities.ToleranceLimitSteps,
  ];
}

/**
 * Next stepOrder for a new step on a given rule, considering the max
 * stepOrder across ALL 9 step-type tables (so ordering stays continuous
 * across types, matching the old single-table RuleSteps behaviour).
 */
async function getNextStepOrder (entities, ruleId) {
  let max = 0;
  for (const entity of stepEntities(entities)) {
    const row = await SELECT.one.from(entity)
      .columns('max(stepOrder) as maxOrder')
      .where({ rule_ID: ruleId });
    if (row?.maxOrder && row.maxOrder > max) max = row.maxOrder;
  }
  return max + 1;
}

/**
 * Reorders steps given a flat list of step IDs (which may belong to any
 * of the 9 step-type tables — the caller doesn't need to know which).
 * Returns the UPDATE statements to run in a transaction.
 */
async function buildReorderUpdates (entities, stepIds) {
  const tables = stepEntities(entities);
  const updates = [];

  for (let idx = 0; idx < stepIds.length; idx++) {
    const id = stepIds[idx];
    let found = false;

    for (const entity of tables) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await SELECT.one.from(entity).where({ ID: id }).columns('ID');
      if (exists) {
        updates.push(UPDATE(entity, id).with({ stepOrder: idx + 1 }));
        found = true;
        break;
      }
    }

    if (!found) {
      const err = new Error(`Step ID "${id}" not found in any step-type table`);
      err.code = 404;
      throw err;
    }
  }

  return updates;
}

module.exports = { stepEntities, getNextStepOrder, buildReorderUpdates };
