'use strict';

const cds = require('@sap/cds');

const LOG = cds.log('lockbox-rules');

const {
  executeStep,
  mergeStepsForExecution
} = require('./lib/step-executor');

const {
  stepEntities,
  getNextStepOrder,
  buildReorderUpdates
} = require('./lib/step-order');


module.exports = class LockboxRulesService extends cds.ApplicationService {

  async init() {

    const {
      Rules,

      ApprovalSteps,
      ApprovalLevels,

      CheckConditionSteps,
      ConditionRows,

      SetVariablesSteps,
      VariableRows,

      ApiMappingSteps,
      AiMappingSteps,

      FieldMappingSteps,
      FieldMappingRows,
      TechnicalComponentRows,

      CallActionSteps,

      ConfigurationSteps,
      ConfigTargetFields,
      ConfigEntryRows,

      ToleranceLimitSteps,
      ToleranceKeys
    } = this.entities;


    // ============================================================
    // STEP ENTITIES
    // ============================================================

    const STEP_ENTITIES = stepEntities(this.entities);


    // ============================================================
    // CHILD / ROW ENTITIES
    // ============================================================

    const ROW_ENTITIES = [
      ConditionRows,
      VariableRows,
      FieldMappingRows,
      TechnicalComponentRows,
      ConfigTargetFields,
      ConfigEntryRows
    ];


    // ============================================================
    // ROW CONFIGURATION
    // ============================================================

    const ROW_CONFIG = [

      {
        entity: ConditionRows,
        parentField: 'conditionStep_ID',
        label: 'Condition Row'
      },

      {
        entity: VariableRows,
        parentField: 'variableStep_ID',
        label: 'Variable Row'
      },

      {
        entity: FieldMappingRows,
        parentField: 'fieldMappingStep_ID',
        label: 'Field Mapping Row'
      },

      {
        entity: TechnicalComponentRows,
        parentField: 'fieldMappingStep_ID',
        label: 'Technical Component Row'
      },

      {
        entity: ConfigTargetFields,
        parentField: 'configStep_ID',
        label: 'Configuration Target Field'
      },

      {
        entity: ConfigEntryRows,
        parentField: 'configStep_ID',
        label: 'Configuration Entry'
      }

    ];


    // ============================================================
    // BEFORE HOOKS
    // ============================================================


    // ------------------------------------------------------------
    // RULE CREATE / SAVE VALIDATION
    // ------------------------------------------------------------

    this.before('SAVE', Rules, async (req) => {

      const { ruleId } = req.data;

      if (!ruleId || !String(ruleId).trim()) {
        return req.error(
          400,
          'Rule ID is required'
        );
      }

      const existing = await SELECT.one
        .from(Rules)
        .where({ ruleId })
        .and(
          req.data.ID
            ? { ID: { '!=': req.data.ID } }
            : {}
        );

      if (existing) {
        return req.error(
          409,
          `Rule "${ruleId}" already exists`
        );
      }

    });


    // ------------------------------------------------------------
    // AUTO ASSIGN STEP ORDER
    // ------------------------------------------------------------

    this.before('CREATE', STEP_ENTITIES, async (req) => {

      // If UI already supplied stepOrder,
      // validate it instead of replacing it.

      if (
        req.data.stepOrder !== undefined &&
        req.data.stepOrder !== null
      ) {

        if (
          !Number.isInteger(req.data.stepOrder) ||
          req.data.stepOrder <= 0
        ) {
          return req.error(
            400,
            'Step Order must be a positive integer'
          );
        }

        return;
      }


      // Automatically generate stepOrder.

      if (req.data.rule_ID) {

        req.data.stepOrder =
          await getNextStepOrder(
            this.entities,
            req.data.rule_ID
          );

      }

    });


    // ------------------------------------------------------------
    // AUTO ASSIGN ROW ORDER
    // ------------------------------------------------------------

    // ============================================================
    // RE-NUMBER ROWS AFTER DELETE
    // ============================================================

    for (const config of ROW_CONFIG) {

      this.before('DELETE', config.entity, async (req) => {

        const rowId =
          req.data?.ID ||
          req.params?.[0]?.ID ||
          req.params?.[0];


        if (!rowId) {
          return;
        }


        // Remember the parent before the row is deleted.
        const deletedRow =
          await SELECT
            .one
            .from(config.entity)
            .columns(
              'ID',
              config.parentField,
              'rowOrder'
            )
            .where({
              ID: rowId
            });


        if (!deletedRow) {
          return;
        }


        req._rowOrderParentId =
          deletedRow[config.parentField];

      });


      this.after('DELETE', config.entity, async (req) => {

        const parentId =
          req._rowOrderParentId;


        if (!parentId) {
          return;
        }


        const rows =
          await SELECT
            .from(config.entity)
            .columns(
              'ID',
              'rowOrder'
            )
            .where({
              [config.parentField]: parentId
            })
            .orderBy(
              'rowOrder asc'
            );


        // Nothing left to reorder.
        if (!rows.length) {
          return;
        }


        // Re-number from 1.
        for (
          let index = 0;
          index < rows.length;
          index++
        ) {

          const expectedOrder =
            index + 1;


          if (
            Number(rows[index].rowOrder) !==
            expectedOrder
          ) {

            await UPDATE(
              config.entity,
              rows[index].ID
            ).with({
              rowOrder: expectedOrder
            });

          }

        }

      });

    }


    // ============================================================
    // CONDITION ROW VALIDATION
    // ============================================================

    this.before('CREATE', ConditionRows, (req) => {

      const d = req.data;


      if (!d.conditionStep_ID) {

        return req.error(
          400,
          'Condition Step is required'
        );

      }


      if (
        d.attribute === undefined ||
        d.attribute === null ||
        !String(d.attribute).trim()
      ) {

        return req.error(
          400,
          'Attribute is required for Condition Row'
        );

      }


      if (!d.operator) {

        return req.error(
          400,
          'Operator is required for Condition Row'
        );

      }


      // Operators where a value is not required.

      const noValueOperators = [
        'IS_NULL',
        'IS_NOT_NULL',
        'IS_EMPTY',
        'IS_NOT_EMPTY',
        'RECORD_EXISTS',
        'RECORD_NOT_EXISTS'
      ];


      if (
        !noValueOperators.includes(d.operator) &&
        (
          d.value === undefined ||
          d.value === null
        )
      ) {

        return req.error(
          400,
          `Value is required for operator "${d.operator}"`
        );

      }

    });


    // ============================================================
    // VARIABLE ROW VALIDATION
    // ============================================================

    this.before('CREATE', VariableRows, (req) => {

      const d = req.data;


      if (!d.variableStep_ID) {

        return req.error(
          400,
          'Set Variables Step is required'
        );

      }


      if (
        d.keys === undefined ||
        d.keys === null ||
        !String(d.keys).trim()
      ) {

        return req.error(
          400,
          'Variable Key is required'
        );

      }

    });


    // ============================================================
    // FIELD MAPPING ROW VALIDATION
    // ============================================================

    this.before('CREATE', FieldMappingRows, (req) => {

      const d = req.data;


      if (!d.fieldMappingStep_ID) {

        return req.error(
          400,
          'Field Mapping Step is required'
        );

      }


      if (
        d.sourceField === undefined ||
        d.sourceField === null ||
        !String(d.sourceField).trim()
      ) {

        return req.error(
          400,
          'Source Field is required'
        );

      }


      if (
        d.targetField === undefined ||
        d.targetField === null ||
        !String(d.targetField).trim()
      ) {

        return req.error(
          400,
          'Target Field is required'
        );

      }

    });


    // ============================================================
    // TECHNICAL COMPONENT ROW VALIDATION
    // ============================================================

    this.before(
      'CREATE',
      TechnicalComponentRows,
      (req) => {

        const d = req.data;


        if (!d.fieldMappingStep_ID) {

          return req.error(
            400,
            'Field Mapping Step is required'
          );

        }


        // At least one implementation must be supplied.

        if (
          !d.functionCds &&
          !d.programLogic
        ) {

          return req.error(
            400,
            'Function CDS or Program Logic is required'
          );

        }

      }
    );


    // ============================================================
    // CONFIGURATION TARGET FIELD VALIDATION
    // ============================================================

    this.before(
      'CREATE',
      ConfigTargetFields,
      (req) => {

        const d = req.data;


        if (!d.configStep_ID) {

          return req.error(
            400,
            'Configuration Step is required'
          );

        }


        if (
          d.sapField === undefined ||
          d.sapField === null ||
          !String(d.sapField).trim()
        ) {

          return req.error(
            400,
            'SAP Field is required'
          );

        }

      }
    );


    // ============================================================
    // CONFIGURATION ENTRY VALIDATION
    // ============================================================

    this.before(
      'CREATE',
      ConfigEntryRows,
      (req) => {

        const d = req.data;


        if (!d.configStep_ID) {

          return req.error(
            400,
            'Configuration Step is required'
          );

        }


        if (
          d.keyValue === undefined ||
          d.keyValue === null ||
          !String(d.keyValue).trim()
        ) {

          return req.error(
            400,
            'Key Value is required'
          );

        }

      }
    );


    // ============================================================
    // APPROVAL LEVEL VALIDATION
    // ============================================================

    this.before('SAVE', ApprovalSteps, (req) => {

      const levels = req.data.levels || [];


      if (levels.length === 0) {
        return;
      }


      const sorted = [...levels]
        .sort(
          (a, b) =>
            Number(a.levelOrder) -
            Number(b.levelOrder)
        );


      for (
        let i = 1;
        i < sorted.length;
        i++
      ) {

        if (
          Number(sorted[i].ifAmountExceeds) <=
          Number(sorted[i - 1].ifAmountExceeds)
        ) {

          return req.error(
            400,
            `Level L${i + 1} amount must exceed L${i} amount`
          );

        }

      }

    });


    // ============================================================
    // TOLERANCE LIMIT VALIDATION
    // ============================================================

    this.before(
      'SAVE',
      ToleranceLimitSteps,
      (req) => {

        if (!req.data.toleranceKey_ID) {

          return req.error(
            400,
            'Tolerance Key is required for Tolerance Limit step'
          );

        }

      }
    );


    // ============================================================
    // TOLERANCE KEY VALIDATION
    // ============================================================

    this.before(
      ['CREATE', 'UPDATE'],
      ToleranceKeys,
      async (req) => {

        const d = req.data;


        if (
          !d.checkField ||
          !String(d.checkField).trim()
        ) {

          return req.error(
            400,
            'Source Field is required for a Tolerance Key'
          );

        }


        if (
          !d.referenceField ||
          !String(d.referenceField).trim()
        ) {

          return req.error(
            400,
            'Target Field is required for a Tolerance Key'
          );

        }


        if (
          d.toleranceKey === undefined ||
          d.toleranceKey === null ||
          !String(d.toleranceKey).trim()
        ) {

          return req.error(
            400,
            'Tolerance Key is required'
          );

        }


        if (String(d.toleranceKey).length > 2) {

          return req.error(
            400,
            'Tolerance Key must not exceed 2 characters'
          );

        }


        const existing = await SELECT.one
          .from(ToleranceKeys)
          .where({
            toleranceKey: d.toleranceKey
          })
          .and(
            d.ID
              ? { ID: { '!=': d.ID } }
              : {}
          );


        if (existing) {

          return req.error(
            409,
            `Tolerance Key "${d.toleranceKey}" already exists`
          );

        }

      }
    );


    // ============================================================
    // AFTER READ
    // ============================================================

    this.after('READ', Rules, (rules) => {

      if (!rules) {
        return;
      }


      const list =
        Array.isArray(rules)
          ? rules
          : [rules];


      const stepNavs = [

        'approvalSteps',
        'checkConditionSteps',
        'setVariablesSteps',
        'apiMappingSteps',
        'aiMappingSteps',
        'fieldMappingSteps',
        'callActionSteps',
        'configurationSteps',
        'toleranceLimitSteps'

      ];


      list.forEach((r) => {

        const hasAnyNav =
          stepNavs.some(
            n => Array.isArray(r[n])
          );


        if (hasAnyNav) {

          r.stepCount =
            stepNavs.reduce(
              (sum, n) =>
                sum +
                (r[n]?.length || 0),
              0
            );

        }

      });

    });


    // ============================================================
    // EXECUTE RULE
    // ============================================================

    this.on(
      'executeRule',
      Rules,
      async (req) => {

        const ruleUUID =
          req.params[0].ID;


        let payload = {};


        // --------------------------------------------------------
        // Validate JSON payload
        // --------------------------------------------------------

        try {

          payload =
            JSON.parse(
              req.data.payload || '{}'
            );

        } catch (err) {

          return req.error(
            400,
            'Payload must be valid JSON'
          );

        }


        // --------------------------------------------------------
        // Load rule
        // --------------------------------------------------------

        const rule =
          await SELECT
            .one
            .from(Rules, ruleUUID)
            .columns(r => {

              r.ruleId,
                r.description,
                r.isActive;


              r.approvalSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName;

                s.amountField,
                  s.currency,
                  s.cc,
                  s.emailSubject,
                  s.emailBody;

                s.levels(l => {

                  l.levelOrder,
                    l.levelLabel,
                    l.ifAmountExceeds,
                    l.approverEmail

                });

              });


              r.checkConditionSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName;

                s.conditions(c => {

                  c.rowOrder,
                    c.attribute,
                    c.operator,
                    c.value

                });

              });


              r.setVariablesSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName;

                s.variables(v => {

                  v.rowOrder,
                    v.keys,
                    v.value

                });

              });


              r.apiMappingSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName;

                s.sourceType,
                  s.method,
                  s.destination,
                  s.serviceUrl

              });


              r.aiMappingSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName;

                s.modelId,
                  s.prompt,
                  s.outputField

              });


              r.fieldMappingSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName;


                s.fieldMappings(fmr => {

                  fmr.rowOrder,
                    fmr.sourceField,
                    fmr.targetField,
                    fmr.ruleType

                });


                s.technicalComponents(tc => {

                  tc.rowOrder,
                    tc.functionCds,
                    tc.programLogic

                });

              });


              r.callActionSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName;

                s.functionCds,
                  s.programLogic

              });


              r.configurationSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName;

                s.keyFieldSap,
                  s.keyFieldLabel,
                  s.outputVariable;


                s.targetFields(tf => {

                  tf.rowOrder,
                    tf.sapField,
                    tf.displayLabel,
                    tf.isRequired

                });


                s.entries(e => {

                  e.rowOrder,
                    e.keyValue,
                    e.fieldValues

                });

              });


              r.toleranceLimitSteps(s => {

                s.ID,
                  s.stepOrder,
                  s.stepName,
                  s.action;

                s.lowerAmount,
                  s.upperAmount,
                  s.lowerPercent,
                  s.upperPercent;

                s.toleranceKey_ID

              });

            });


        // --------------------------------------------------------
        // Rule validation
        // --------------------------------------------------------

        if (!rule) {

          return req.error(
            404,
            `Rule ${ruleUUID} not found`
          );

        }


        if (!rule.isActive) {

          return req.error(
            422,
            `Rule "${rule.ruleId}" is inactive`
          );

        }


        // --------------------------------------------------------
        // Resolve tolerance keys
        // --------------------------------------------------------

        const keyIds = [
          ...new Set(
            (rule.toleranceLimitSteps || [])
              .map(
                s => s.toleranceKey_ID
              )
              .filter(Boolean)
          )
        ];


        let keysById = {};


        if (keyIds.length) {

          const keys =
            await SELECT
              .from(ToleranceKeys)
              .columns(
                'ID',
                'toleranceKey',
                'description',
                'currency',
                'checkField',
                'referenceField'
              )
              .where({
                ID: {
                  in: keyIds
                }
              });


          keysById =
            Object.fromEntries(
              keys.map(
                k => [k.ID, k]
              )
            );

        }


        (
          rule.toleranceLimitSteps || []
        ).forEach((s) => {

          s.toleranceKey =
            keysById[
            s.toleranceKey_ID
            ] || null;

        });


        // --------------------------------------------------------
        // Execute steps
        // --------------------------------------------------------

        const sortedSteps =
          mergeStepsForExecution(rule);


        const traceSteps = [];


        let context = {
          ...payload
        };


        for (const step of sortedSteps) {

          const trace = {

            stepOrder:
              step.stepOrder,

            stepName:
              step.stepName,

            stepType:
              step.stepType

          };


          try {

            const result =
              await executeStep(
                step,
                context
              );


            context = {

              ...context,

              ...(result.contextUpdates || {})

            };


            trace.status =
              result.passed === false
                ? 'SKIPPED'
                : 'PASSED';


            trace.output =
              JSON.stringify(
                result.output ?? null
              );


          } catch (err) {

            LOG.error(
              `Step "${step.stepName}" failed:`,
              err
            );


            trace.status =
              'FAILED';


            trace.output =
              err.message;


            traceSteps.push(
              trace
            );


            return {

              success: false,

              message:
                `Step "${step.stepName}" failed: ${err.message}`,

              traceSteps

            };

          }


          traceSteps.push(
            trace
          );

        }


        return {

          success: true,

          message:
            `Rule "${rule.ruleId}" executed successfully`,

          traceSteps

        };

      }
    );


    // ============================================================
    // TOGGLE ACTIVE
    // ============================================================

    this.on(
      'toggleActive',
      Rules,
      async (req) => {

        const ruleUUID =
          req.params[0].ID;


        const rule =
          await SELECT
            .one
            .from(Rules, ruleUUID)
            .columns('isActive');


        if (!rule) {

          return req.error(
            404,
            'Rule not found'
          );

        }


        const newValue =
          !rule.isActive;


        await UPDATE(
          Rules,
          ruleUUID
        ).with({
          isActive: newValue
        });


        LOG.info(
          `Rule ${ruleUUID} toggled → isActive=${newValue}`
        );


        return {
          isActive: newValue
        };

      }
    );


    // ============================================================
    // VALIDATE ALL RULES
    // ============================================================

    this.on(
      'validateAllRules',
      async () => {

        const activeRules =
          await SELECT
            .from(Rules)
            .columns(r => {

              r.ID,
                r.ruleId;


              r.approvalSteps(s => {
                s.stepName
              });


              r.checkConditionSteps(s => {
                s.stepName
              });


              r.setVariablesSteps(s => {
                s.stepName
              });


              r.apiMappingSteps(s => {
                s.stepName
              });


              r.aiMappingSteps(s => {
                s.stepName
              });


              r.fieldMappingSteps(s => {
                s.stepName
              });


              r.callActionSteps(s => {
                s.stepName
              });


              r.configurationSteps(s => {
                s.stepName
              });


              r.toleranceLimitSteps(s => {
                s.stepName
              });

            })
            .where({
              isActive: true
            });


        const stepNavs = [

          'approvalSteps',
          'checkConditionSteps',
          'setVariablesSteps',
          'apiMappingSteps',
          'aiMappingSteps',
          'fieldMappingSteps',
          'callActionSteps',
          'configurationSteps',
          'toleranceLimitSteps'

        ];


        const errors = [];


        for (const rule of activeRules) {

          const totalSteps =
            stepNavs.reduce(
              (sum, n) =>
                sum +
                (rule[n]?.length || 0),
              0
            );


          if (totalSteps === 0) {

            errors.push({

              ruleId:
                rule.ruleId,

              stepName:
                '-',

              message:
                'Rule has no steps'

            });

          }

        }


        return {

          valid:
            errors.length === 0,

          errors

        };

      }
    );


    // ============================================================
    // REORDER STEPS
    // ============================================================

    this.on(
      'reorderSteps',
      async (req) => {

        const {
          ruleId,
          stepIds
        } = req.data;


        if (!ruleId) {

          return req.error(
            400,
            'ruleId is required'
          );

        }


        if (
          !Array.isArray(stepIds) ||
          stepIds.length === 0
        ) {

          return req.error(
            400,
            'stepIds is required'
          );

        }


        const rule =
          await SELECT
            .one
            .from(Rules)
            .where({
              ruleId
            });


        if (!rule) {

          return req.error(
            404,
            `Rule "${ruleId}" not found`
          );

        }


        let updates;


        try {

          updates =
            await buildReorderUpdates(
              this.entities,
              stepIds
            );

        } catch (err) {

          LOG.error(
            'Reorder validation failed:',
            err
          );


          return req.error(
            err.code || 400,
            err.message ||
            'Unable to reorder steps'
          );

        }


        try {

          await cds
            .tx(req)
            .run(updates);

        } catch (err) {

          LOG.error(
            'Reorder database operation failed:',
            err
          );


          return req.error(
            400,
            'Unable to reorder steps'
          );

        }


        return {
          success: true
        };

      }
    );


    // ============================================================
    // ACTION TYPES
    // ============================================================

    this.on(
      'getActionTypes',
      () => [

        {
          key: 'APPROVAL',
          label: 'Approval'
        },

        {
          key: 'CHECK_CONDITION',
          label: 'Check Condition'
        },

        {
          key: 'SET_VARIABLES',
          label: 'Set Multiple Variables'
        },

        {
          key: 'API_MAPPING',
          label: 'API Mapping'
        },

        {
          key: 'AI_MAPPING',
          label: 'AI Mapping'
        },

        {
          key: 'FIELD_MAPPING',
          label: 'Field Mapping'
        },

        {
          key: 'CALL_ACTION',
          label: 'Call Action'
        },

        {
          key: 'CONFIGURATION',
          label: 'Configuration'
        },

        {
          key: 'TOLERANCE_LIMIT',
          label: 'Tolerance Limit'
        }

      ]
    );


    // ============================================================
    // OPERATORS
    // ============================================================

    this.on(
      'getOperators',
      () => [

        {
          key: 'EQUALS',
          label: 'Equals'
        },

        {
          key: 'NOT_EQUALS',
          label: 'Not Equals'
        },

        {
          key: 'GREATER_THAN',
          label: 'Greater Than'
        },

        {
          key: 'GREATER_OR_EQUAL',
          label: 'Greater or Equal'
        },

        {
          key: 'LESS_THAN',
          label: 'Less Than'
        },

        {
          key: 'LESS_OR_EQUAL',
          label: 'Less or Equal'
        },

        {
          key: 'CONTAINS',
          label: 'Contains'
        },

        {
          key: 'NOT_CONTAINS',
          label: 'Not Contains'
        },

        {
          key: 'STARTS_WITH',
          label: 'Starts With'
        },

        {
          key: 'ENDS_WITH',
          label: 'Ends With'
        },

        {
          key: 'MATCHES_REGEX',
          label: 'Matches Regex'
        },

        {
          key: 'IS_EMPTY',
          label: 'Is Empty'
        },

        {
          key: 'IS_NOT_EMPTY',
          label: 'Is Not Empty'
        },

        {
          key: 'IS_NULL',
          label: 'Is Null'
        },

        {
          key: 'IS_NOT_NULL',
          label: 'Is Not Null'
        },

        {
          key: 'RECORD_EXISTS',
          label: 'Exists'
        },

        {
          key: 'RECORD_NOT_EXISTS',
          label: 'Not Exists'
        },

        {
          key: 'BETWEEN',
          label: 'Between'
        },

        {
          key: 'NOT_BETWEEN',
          label: 'Not Between'
        },

        {
          key: 'IN',
          label: 'In List'
        },

        {
          key: 'NOT_IN',
          label: 'Not In List'
        },

        {
          key: 'BEFORE',
          label: 'Before'
        },

        {
          key: 'AFTER',
          label: 'After'
        },

        {
          key: 'ON',
          label: 'On Date'
        },

        {
          key: 'THIS_WEEK',
          label: 'This Week'
        },

        {
          key: 'THIS_MONTH',
          label: 'This Month'
        },

        {
          key: 'THIS_YEAR',
          label: 'This Year'
        },

        {
          key: 'LAST_N_DAYS',
          label: 'Last N Days'
        },

        {
          key: 'NEXT_N_DAYS',
          label: 'Next N Days'
        }

      ]
    );


    // ============================================================
    // GET STEPS BY RULE
    // ============================================================

    this.on(
      'getStepsByRule',
      async (req) => {

        const {
          ruleId
        } = req.data;


        if (!ruleId) {

          return req.error(
            400,
            'ruleId is required'
          );

        }


        const rule =
          await SELECT
            .one
            .from(Rules)
            .where({
              ruleId
            })
            .columns(r => {

              r.ID;


              r.approvalSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });


              r.checkConditionSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });


              r.setVariablesSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });


              r.apiMappingSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });


              r.aiMappingSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });


              r.fieldMappingSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });


              r.callActionSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });


              r.configurationSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });


              r.toleranceLimitSteps(s => {
                s.ID,
                  s.stepOrder,
                  s.stepName
              });

            });


        if (!rule) {

          return req.error(
            404,
            `Rule "${ruleId}" not found`
          );

        }


        return mergeStepsForExecution(
          rule
        ).map(s => ({

          ID:
            s.ID,

          stepOrder:
            s.stepOrder,

          stepName:
            s.stepName,

          stepType:
            s.stepType

        }));

      }
    );


    // ============================================================
    // DATABASE / INPUT ERROR NORMALIZATION
    // ============================================================
    //
    // This is only a safety net.
    //
    // The CREATE hooks above should prevent most database
    // constraint errors before SQLite is reached.
    //
    // If a database constraint still leaks through, convert
    // known client-data problems into useful HTTP errors.
    // ============================================================

    this.on(
      'error',
      (err, req) => {

        if (!err) {
          return;
        }


        const message =
          String(err.message || '');


        // --------------------------------------------------------
        // NOT NULL
        // --------------------------------------------------------

        if (
          /NOT NULL constraint failed/i
            .test(message)
        ) {

          const match =
            message.match(
              /NOT NULL constraint failed:\s*[^.]+\.(.+)$/i
            );


          const field =
            match?.[1] ||
            'required field';


          err.status =
            400;

          err.code =
            'VALIDATION_ERROR';

          err.message =
            `${field} is required`;


          LOG.warn(
            `Validation error: ${err.message}`
          );


          return;

        }


        // --------------------------------------------------------
        // UNIQUE
        // --------------------------------------------------------

        if (
          /UNIQUE constraint failed/i
            .test(message)
        ) {

          err.status =
            409;

          err.code =
            'DUPLICATE_ERROR';

          err.message =
            'A record with the same unique value already exists';


          LOG.warn(
            `Duplicate error: ${message}`
          );


          return;

        }


        // --------------------------------------------------------
        // FOREIGN KEY
        // --------------------------------------------------------

        if (
          /FOREIGN KEY constraint failed/i
            .test(message)
        ) {

          err.status =
            400;

          err.code =
            'INVALID_REFERENCE';

          err.message =
            'The request contains an invalid reference';


          LOG.warn(
            `Reference error: ${message}`
          );


          return;

        }

      }
    );


    // ============================================================
    // FINALLY INITIALIZE CAP SERVICE
    // ============================================================

    await super.init();

  }

};