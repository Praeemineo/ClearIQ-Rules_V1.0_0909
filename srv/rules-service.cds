using { lockbox } from '../db/schema';

// ─────────────────────────────────────────────────────────────────
//  LockboxRulesService  –  exposed at /odata/v4/rules
//  Every entity below is a plain projection (no restrict/readonly),
//  so Fiori Elements gets full CRUD on all of them out of the box.
// ─────────────────────────────────────────────────────────────────
@requires: 'ClearIQRuleAdmin'
service LockboxRulesService @(path:'/odata/v4/rules') {

  // ── Main Rules entity ──────────────────────────────────────────
  // @odata.draft.enabled cascades to every Composition child below
  // (all 9 step-type entities and their row-level children) — the
  // whole tree becomes one draft, saved/discarded together.
  @odata.draft.enabled
  entity Rules as projection on lockbox.Rules
    actions {
      action executeRule(payload : LargeString) returns ExecutionResult;
      action toggleActive()                     returns { isActive : Boolean };
    };

  // ── Step-type entities (each directly composed on Rules) ──────
  entity ApprovalSteps          as projection on lockbox.ApprovalStep;
  entity ApprovalLevels         as projection on lockbox.ApprovalLevels;

  entity CheckConditionSteps    as projection on lockbox.CheckConditionStep;
  entity ConditionRows          as projection on lockbox.ConditionRows;

  entity SetVariablesSteps      as projection on lockbox.SetVariablesStep;
  entity VariableRows           as projection on lockbox.VariableRows;

  entity ApiMappingSteps        as projection on lockbox.ApiMappingStep;

  entity AiMappingSteps         as projection on lockbox.AiMappingStep;

  entity FieldMappingSteps      as projection on lockbox.FieldMappingStep;
  entity FieldMappingRows       as projection on lockbox.FieldMappingRows;
  entity TechnicalComponentRows as projection on lockbox.TechnicalComponentRows;

  entity CallActionSteps        as projection on lockbox.CallActionStep;

  entity ConfigurationSteps     as projection on lockbox.ConfigurationStep;
  entity ConfigTargetFields     as projection on lockbox.ConfigTargetFields;
  entity ConfigEntryRows        as projection on lockbox.ConfigEntryRows;

  // toleranceKey is now a plain UUID field (toleranceKey_ID), not a
  // CDS Association — see schema.cds. That's what let ToleranceKeys
  // below go back to being a clean standalone draft root without the
  // earlier cross-boundary nav-property conflict.
  entity ToleranceLimitSteps    as projection on lockbox.ToleranceLimitStep;
  entity PostToGLSteps as projection on lockbox.PostToGLStep;

  @odata.draft.enabled
  entity ToleranceKeys          as projection on lockbox.ToleranceKeys;

  // ── Unbound actions ───────────────────────────────────────────
  action  validateAllRules()                                    returns ValidationReport;
  action  reorderSteps(ruleId : String, stepIds : many String)   returns { success : Boolean };

  // ── Function imports ──────────────────────────────────────────
  function getActionTypes()                returns many ActionTypeItem;
  function getOperators()                  returns many OperatorItem;
  function getStepsByRule(ruleId : String) returns many MergedStep;

  // ── Return / param types ──────────────────────────────────────
  type ExecutionResult {
    success    : Boolean;
    message    : String;
    traceSteps : many StepTrace;
  }

  type StepTrace {
    stepOrder  : Integer;
    stepName   : String;
    stepType   : String;
    status     : String;
    output     : LargeString;
  }

  type ValidationReport {
    valid  : Boolean;
    errors : many ValidationError;
  }

  type ValidationError {
    ruleId   : String;
    stepName : String;
    message  : String;
  }

  // Flat, type-tagged view of a step, used by getStepsByRule() since
  // steps now live across 9 separate entities rather than one table.
  type MergedStep {
    ID        : UUID;
    stepOrder : Integer;
    stepName  : String;
    stepType  : String;
  }

  type ActionTypeItem { keys : String; label : String; }
  type OperatorItem   { keys : String; label : String; }

  // ── Code lists (read-only, back the dropdown fields) ───────────
@readonly entity ConditionOperators as projection on lockbox.ConditionOperators;
@readonly entity SourceTypes        as projection on lockbox.SourceTypes;
@readonly entity HttpMethods        as projection on lockbox.HttpMethods;
@readonly entity ApiDestinations    as projection on lockbox.ApiDestinations;
@readonly entity FieldRuleTypes     as projection on lockbox.FieldRuleTypes;
@readonly entity ConditionAttributes as projection on lockbox.ConditionAttributes;

    @odata.draft.enabled
    entity Configuration as projection on lockbox.Configuration;


    @odata.draft.enabled
    entity ReasonCodes as projection on lockbox.ReasonCodes;
}