using { cuid, managed } from '@sap/cds/common';

namespace lockbox;


// Local CodeList aspect — small, dependency-free reuse type for
// fixed-value dropdown/code-list entities (mirrors @sap/cds/common's
// CodeList, defined locally to avoid package resolution issues).
aspect CodeList {
  name  : localized String(255);
  descr : localized String(1000);
}


type ActionType : String(30) enum {
  APPROVAL         = 'APPROVAL';
  CHECK_CONDITION  = 'CHECK_CONDITION';
  SET_VARIABLES    = 'SET_VARIABLES';
  API_MAPPING      = 'API_MAPPING';
  AI_MAPPING       = 'AI_MAPPING';
  FIELD_MAPPING    = 'FIELD_MAPPING';
  CALL_ACTION      = 'CALL_ACTION';
  CONFIGURATION    = 'CONFIGURATION';
  TOLERANCE_LIMIT  = 'TOLERANCE_LIMIT';
}

type ConditionOperator : String(20) enum {
  EQUALS            @title: 'Equals'             = 'EQUALS';
  NOT_EQUALS        @title: 'Not Equals'         = 'NOT_EQUALS';
  GREATER_THAN      @title: 'Greater Than'       = 'GREATER_THAN';
  GREATER_OR_EQUAL  @title: 'Greater or Equal'   = 'GREATER_OR_EQUAL';
  LESS_THAN         @title: 'Less Than'          = 'LESS_THAN';
  LESS_OR_EQUAL     @title: 'Less or Equal'      = 'LESS_OR_EQUAL';
  CONTAINS          @title: 'Contains'           = 'CONTAINS';
  NOT_CONTAINS      @title: 'Not Contains'       = 'NOT_CONTAINS';
  STARTS_WITH       @title: 'Starts With'        = 'STARTS_WITH';
  ENDS_WITH         @title: 'Ends With'          = 'ENDS_WITH';
  MATCHES_REGEX     @title: 'Matches Regex'      = 'MATCHES_REGEX';
  IS_EMPTY          @title: 'Is Empty'           = 'IS_EMPTY';
  IS_NOT_EMPTY      @title: 'Is Not Empty'       = 'IS_NOT_EMPTY';
  IS_NULL           @title: 'Is Null'            = 'IS_NULL';
  IS_NOT_NULL       @title: 'Is Not Null'        = 'IS_NOT_NULL';
  RECORD_EXISTS     @title: 'Exists'             = 'RECORD_EXISTS';
  RECORD_NOT_EXISTS @title: 'Not Exists'         = 'RECORD_NOT_EXISTS';
  BETWEEN           @title: 'Between'            = 'BETWEEN';
  NOT_BETWEEN       @title: 'Not Between'        = 'NOT_BETWEEN';
  IN_LIST           @title: 'In List'            = 'IN';
  NOT_IN            @title: 'Not In List'        = 'NOT_IN';
  BEFORE            @title: 'Before'             = 'BEFORE';
  AFTER             @title: 'After'              = 'AFTER';
  ON_DATE           @title: 'On Date'            = 'ON';
  THIS_WEEK         @title: 'This Week'          = 'THIS_WEEK';
  THIS_MONTH        @title: 'This Month'         = 'THIS_MONTH';
  THIS_YEAR         @title: 'This Year'          = 'THIS_YEAR';
  LAST_N_DAYS       @title: 'Last N Days'        = 'LAST_N_DAYS';
  NEXT_N_DAYS       @title: 'Next N Days'        = 'NEXT_N_DAYS';
}

type HttpMethod : String(10) enum {
  GET    @title: 'GET'    = 'GET';
  POST   @title: 'POST'   = 'POST';
  PUT    @title: 'PUT'    = 'PUT';
  PATCH  @title: 'PATCH'  = 'PATCH';
  DELETE @title: 'DELETE' = 'DELETE';
}

type SourceType : String(20) enum {
  ODATA_V2 @title: 'OData V2' = 'OdataV2';
  ODATA_V4 @title: 'OData V4' = 'OdataV4';
  REST     @title: 'REST'     = 'REST';
  SOAP     @title: 'SOAP'     = 'SOAP';
}

// New — was a free-text String(200) before. BTP destination names are
// fixed/known ahead of time, so an enum gives a real dropdown instead
// of the user having to type the exact destination name correctly.
// Add more members here as new destinations get provisioned in BTP.
type ApiDestination : String(100) enum {
  S4HANA_SYSTEM_DESTINATION @title: 'S/4HANA System' = 'S4HANA_SYSTEM_DESTINATION';
}

// Was API/STATIC/EXPRESSION/AI — simplified to the two values actually
// used in the UI. step-executor.js's FIELD_MAPPING case never branches
// on ruleType (it's descriptive metadata, not execution logic), so this
// change is safe and doesn't touch runtime behaviour.
type FieldRuleType : String(20) enum {
  DIRECT @title: 'Direct' = 'DIRECT';
  LOOKUP @title: 'Lookup' = 'LOOKUP';
}
// (ToleranceCheckMode removed — limits are now "active if a value is
// present" on the ToleranceKeys master row, no separate N/C toggle
// needed. See ToleranceKeys entity below.)

// ─────────────────────────────────────────────
//  RULES  (main list screen)
//  One direct Composition per step type — flat,
//  not nested inside a polymorphic RuleSteps table.
//  This is what makes each step type independently
//  CRUD-able and annotation-tab-able in Fiori Elements
//  with zero custom UI code.
// ─────────────────────────────────────────────

entity Rules : cuid, managed {
  ruleId      : String(50)  not null;
  description : String(500) not null;
  actionType  : String(50);
  executewhen : String(50);
  onerror     : String(50);
  isActive    : Boolean default true;

  approvalSteps       : Composition of many ApprovalStep       on approvalSteps.rule       = $self;
  checkConditionSteps : Composition of many CheckConditionStep on checkConditionSteps.rule = $self;
  setVariablesSteps   : Composition of many SetVariablesStep   on setVariablesSteps.rule   = $self;
  apiMappingSteps     : Composition of many ApiMappingStep     on apiMappingSteps.rule     = $self;
  aiMappingSteps      : Composition of many AiMappingStep      on aiMappingSteps.rule      = $self;
  fieldMappingSteps   : Composition of many FieldMappingStep   on fieldMappingSteps.rule   = $self;
  callActionSteps     : Composition of many CallActionStep     on callActionSteps.rule     = $self;
  configurationSteps  : Composition of many ConfigurationStep  on configurationSteps.rule  = $self;
  toleranceLimitSteps : Composition of many ToleranceLimitStep on toleranceLimitSteps.rule = $self;
  postToGLSteps : Composition of many PostToGLStep on postToGLSteps.rule = $self;
}

// Common fields every step-type entity carries. CDS doesn't support
// entity-level mixins, so these three fields (rule, stepOrder, stepName)
// are repeated on each step-type entity below — that repetition is the
// intentional tradeoff for flat, directly-composable, directly-CRUD-able
// entities.

// ─────────────────────────────────────────────
//  STEP TYPE: Approval
// ─────────────────────────────────────────────

entity ApprovalStep : cuid, managed {
  rule         : Association to Rules;
  stepOrder    : Integer not null;
  stepName     : String(200) not null;

  amountField  : String(200);          // e.g. "Invoice Amount"
  currency     : String(10);           // e.g. "USD"
  cc           : String(500);          // always-notified email(s), comma-separated
  emailSubject : String(500);          // supports :Token syntax
  emailBody    : LargeString;          // supports :Token syntax
  levels       : Composition of many ApprovalLevels on levels.approvalStep = $self;
}

entity ApprovalLevels : cuid {
  approvalStep    : Association to ApprovalStep;
  levelOrder      : Integer not null;   // 1 = L1, 2 = L2, 3 = L3 …
  levelLabel      : String(50);         // e.g. "L1 Approver", "CFO"
  ifAmountExceeds : Decimal(18,2) not null;
  approverEmail   : String(300) not null;
}

// ─────────────────────────────────────────────
//  STEP TYPE: Check Condition
// ─────────────────────────────────────────────

entity CheckConditionStep : cuid, managed {
  rule       : Association to Rules;
  stepOrder  : Integer not null;
  stepName   : String(200) not null;

  conditions : Composition of many ConditionRows on conditions.conditionStep = $self;
}

entity ConditionRows : cuid {
  conditionStep : Association to CheckConditionStep;
  rowOrder      : Integer not null;
  manualfield   : String(20);
  attribute     : String(200) not null;
  operator      : ConditionOperator default 'EQUALS';
  value         : String(500);
}

// ─────────────────────────────────────────────
//  STEP TYPE: Set Multiple Variables
// ─────────────────────────────────────────────

entity SetVariablesStep : cuid, managed {
  rule      : Association to Rules;
  stepOrder : Integer not null;
  stepName  : String(200) not null;

  variables : Composition of many VariableRows on variables.variableStep = $self;
}

entity VariableRows : cuid {
  variableStep : Association to SetVariablesStep;
  rowOrder     : Integer not null;
  keys         : String(200) not null;
  value        : String(1000);
}

// ─────────────────────────────────────────────
//  STEP TYPE: API Mapping
// ─────────────────────────────────────────────

entity ApiMappingStep : cuid, managed {
  rule        : Association to Rules;
  stepOrder   : Integer not null;
  stepName    : String(200) not null;

  sourceType  : SourceType default 'OdataV2';
  method      : HttpMethod default 'GET';
  destination : ApiDestination;   // was: String(200)
  serviceUrl  : String(1000);
}

// ─────────────────────────────────────────────
//  STEP TYPE: AI Mapping
// ─────────────────────────────────────────────

entity AiMappingStep : cuid, managed {
  rule        : Association to Rules;
  stepOrder   : Integer not null;
  stepName    : String(200) not null;

  modelId     : String(200);
  prompt      : LargeString;
  outputField : String(200);
}

// ─────────────────────────────────────────────
//  STEP TYPE: Field Mapping
// ─────────────────────────────────────────────

entity FieldMappingStep : cuid, managed {
  rule                : Association to Rules;
  stepOrder           : Integer not null;
  stepName            : String(200) not null;

  fieldMappings       : Composition of many FieldMappingRows       on fieldMappings.fieldMappingStep       = $self;
  technicalComponents : Composition of many TechnicalComponentRows on technicalComponents.fieldMappingStep = $self;
}

entity FieldMappingRows : cuid {
  fieldMappingStep : Association to FieldMappingStep;
  rowOrder         : Integer not null;
  sourceField      : String(200) not null;
  targetField      : String(200) not null;
  ruleType         : FieldRuleType default 'DIRECT';   
}

entity TechnicalComponentRows : cuid {
  fieldMappingStep : Association to FieldMappingStep;
  rowOrder         : Integer not null;
  functionCds      : String(500);   // named handler, e.g. LockboxService.resolveCustomer
  programLogic     : LargeString;   // CAP/CDS body, e.g. srv.run(SELECT.one.from(KNA1)...)
}

// ─────────────────────────────────────────────
//  STEP TYPE: Call Action
// ─────────────────────────────────────────────

entity CallActionStep : cuid, managed {
  rule         : Association to Rules;
  stepOrder    : Integer not null;
  stepName     : String(200) not null;

  functionCds  : String(500);   // named CDS function to invoke
  programLogic : LargeString;   // inline CAP logic body
}

// ─────────────────────────────────────────────
//  STEP TYPE: Configuration
// ─────────────────────────────────────────────

entity ConfigurationStep : cuid, managed {
  rule           : Association to Rules;
  stepOrder      : Integer not null;
  stepName       : String(200) not null;

  keyFieldSap    : String(200) not null;   // e.g. "CompanyCode"
  keyFieldLabel  : String(200);            // e.g. "Company Code"
  outputVariable : String(200) not null;   // e.g. "Configuration"
  targetFields   : Composition of many ConfigTargetFields on targetFields.configStep = $self;
  entries        : Composition of many ConfigEntryRows    on entries.configStep      = $self;
}

entity ConfigTargetFields : cuid {
  configStep    : Association to ConfigurationStep;
  rowOrder      : Integer not null;
  sapField      : String(200) not null;   // e.g. "Lockbox"
  displayLabel  : String(200);            // e.g. "Lockbox"
  isRequired    : Boolean default false;
}

entity ConfigEntryRows : cuid {
  configStep    : Association to ConfigurationStep;
  rowOrder      : Integer not null;
  keyValue      : String(500) not null;    // e.g. "1000"  (CompanyCode value)
  fieldValues   : LargeString;             // JSON: { "Lockbox": "LBX_US_01" }
}

// ─────────────────────────────────────────────
//  STEP TYPE: Tolerance Limit
//  ToleranceKeys holds what's fixed per key — Currency, Source Field,
//  Target Field, Description — set once, rarely touched. The step
//  holds what changes every time a rule is configured — the actual
//  Lower/Upper Amount/Percent limits — plus "action" for breach
//  behavior.
// ─────────────────────────────────────────────

entity ToleranceLimitStep : cuid, managed {
  rule         : Association to Rules;
  stepOrder    : Integer not null;
  stepName     : String(200) not null;

  toleranceKey_ID : UUID not null;

  lowerAmount  : Decimal(15,2);  // Limit Amount → Lower
  upperAmount  : Decimal(15,2);  // Limit Amount → Upper
  lowerPercent : Decimal(5,2);   // Limit %age   → Lower
  upperPercent : Decimal(5,2);   // Limit %age   → Upper

  action       : String(20) enum { MANUAL_REVIEW; BLOCK; WARN } default 'MANUAL_REVIEW';
}

entity ToleranceKeys : cuid, managed {
  toleranceKey   : String(2)  not null;
  description    : String(60);

  currency       : String(3) default 'USD';
  checkField     : String(200) not null;
  referenceField : String(200) not null;
}
entity ConditionOperators : CodeList {
  key code : String(20);
}

entity SourceTypes : CodeList {
  key code : String(20);
}

entity HttpMethods : CodeList {
  key code : String(10);
}

entity ApiDestinations : CodeList {
  key code : String(100);
}

entity FieldRuleTypes : CodeList {
  key code : String(20);
}

entity ConditionAttributes : CodeList {
  key code : String(100);
}

entity PostToGLStep : cuid, managed {
  rule         : Association to Rules;
  stepOrder    : Integer not null;
  stepName     : String(200) not null;

  glAccount    : String(200);   // GL Account
  costCenter   : String(200);   // Cost Center
  profitCenter : String(200);   // Profit Center
  segment      : String(200);   // Segment
}

entity Configuration : cuid, managed {
    Company             : String(10);
    Lockbox             : String(20);
    LockboxBatch        : String(20);
    LockboxDestination  : String(40);
    Currency            : String(5);
    HouseBank           : String(5);
    Channel             : String(20);
    Active              : Boolean default true;
}


entity ReasonCodes : cuid, managed {
    Code                : String(10);
    RemittancePattern   : String(40);
    SAPReason           : String(10);
    DisputeType         : String(20);
    Owner               : String(40);
    AutoCreate          : Boolean default false;
    GL                  : String(10);
}