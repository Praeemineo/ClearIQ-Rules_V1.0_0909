using LockboxRulesService as service from '../../srv/rules-service';

// ─────────────────────────────────────────────────────────────────
//  UI annotations, written in native CDS syntax (not XML).
//  These drive the built-in `cds watch` Fiori preview directly.
//  The annotation.xml used by the real deployed Fiori app is separate
//  and unaffected by this file — but you can keep both in sync, or
//  eventually replace the XML with this if you prefer co-locating
//  UI annotations with the service definition (common CAP practice).
// ─────────────────────────────────────────────────────────────────

// NOTE on Facets order below: General Information and Approval keep
// their original positions (not mentioned in the requested reorder).
// After that: Check Condition, API Mapping, Field Mapping, Call
// Action, [Post to G/L — placeholder, commented out, no backing
// entity yet], Set Variables. AI Mapping, Configuration, and
// Tolerance Limit facets are commented out per request — their step
// types still exist in the backend/schema, just not shown as tabs on
// the Rule Object Page right now.
annotate service.Rules with @(
  UI.HeaderInfo: {
    TypeName      : 'Rule',
    TypeNamePlural: 'Rules',
    Title         : { Value: ruleId },
    Description   : { Value: description },
  },

  UI.SelectionFields: [ ruleId, description, actionType, isActive ],

  UI.LineItem: [
    { Value: ruleId,      Label: 'Rule ID' },
    { Value: description, Label: 'Description' },
    { Value: actionType,  Label: 'Action Type' },
    { Value: isActive,    Label: 'Active' },
  ],

  UI.FieldGroup #GeneratedGroup: {
    Data: [
      { Value: ruleId,      Label: 'Rule ID' },
      { Value: description, Label: 'Description' },
      { Value: actionType,  Label: 'Action Type' },
      { Value: executewhen, Label: 'Execute When'},
      { Value: onerror,     Label:  'OnError'},
      { Value: isActive,    Label: 'Active' },
    ],
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'GeneratedFacet1',
      Label : 'General Information',
      Target: '@UI.FieldGroup#GeneratedGroup',
    },
    // {
    //   $Type : 'UI.ReferenceFacet',
    //   ID    : 'ApprovalStepsFacet',
    //   Label : 'Approval',
    //   Target: 'approvalSteps/@UI.LineItem',
    // },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'CheckConditionFacet',
      Label : 'Check Condition',
      Target: 'checkConditionSteps/@UI.LineItem',
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'ApiMappingFacet',
      Label : 'API Mapping',
      Target: 'apiMappingSteps/@UI.LineItem',
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'FieldMappingFacet',
      Label : 'Field Mapping',
      Target: 'fieldMappingSteps/@UI.LineItem',
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'CallActionFacet',
      Label : 'Call Action',
      Target: 'callActionSteps/@UI.LineItem',
    },
    // Post to G/L — placeholder, coming later. No backing entity/
    // composition exists yet, so this stays commented out until
    // there's a real "postToGLSteps" (or similar) composition +
    // @UI.LineItem to target. Uncomment and fix Target once built:
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'PostToGLFacet',
      Label : 'Post to G/L',
      Target: 'postToGLSteps/@UI.LineItem',
    },
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'SetVariablesFacet',
      Label : 'Set Variables',
      Target: 'setVariablesSteps/@UI.LineItem',
    },

    // ── Commented out per request (AI Mapping / Configuration /
    // Tolerance Limit) — step types and their entities/annotations
    // still exist below, just not shown as Rule Object Page tabs.
    // {
    //   $Type : 'UI.ReferenceFacet',
    //   ID    : 'AiMappingFacet',
    //   Label : 'AI Mapping',
    //   Target: 'aiMappingSteps/@UI.LineItem',
    // },
    // {
    //   $Type : 'UI.ReferenceFacet',
    //   ID    : 'ConfigurationFacet',
    //   Label : 'Configuration',
    //   Target: 'configurationSteps/@UI.LineItem',
    // },
    // {
    //   $Type : 'UI.ReferenceFacet',
    //   ID    : 'ToleranceLimitFacet',
    //   Label : 'Tolerance Limit',
    //   Target: 'toleranceLimitSteps/@UI.LineItem',
    // },
  ],
);

// ── Step-type entity list columns ──────────────────────────────
// Each of these gives its own List Report / embedded table columns.
// Every step-type entity shares stepOrder/stepName as the first two
// columns, then its own fields.

annotate service.PostToGLSteps with @(
  UI.HeaderInfo: {
    TypeName      : 'Post to G/L Step',
    TypeNamePlural: 'Post to G/L Steps',
    Title         : { Value: stepName },
  },
  UI.LineItem: [
    { Value: stepOrder,    Label: 'Priority' },
    { Value: stepName,     Label: 'Step Name' },
    { Value: glAccount,    Label: 'GL Account' },
    { Value: costCenter,   Label: 'Cost Center' },
    { Value: profitCenter, Label: 'Profit Center' },
    { Value: segment,      Label: 'Segment' },
  ],
  UI.FieldGroup #GeneratedGroup: {
    Data: [
      { Value: stepOrder,    Label: 'Priority' },
      { Value: stepName,     Label: 'Step Name' },
      { Value: glAccount,    Label: 'GL Account' },
      { Value: costCenter,   Label: 'Cost Center' },
      { Value: profitCenter, Label: 'Profit Center' },
      { Value: segment,      Label: 'Segment' },
    ],
  },
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'GeneratedFacet1',
      Label : 'General Information',
      Target: '@UI.FieldGroup#GeneratedGroup',
    },
  ],
);

annotate service.ApprovalSteps with @(
  UI.HeaderInfo: {
    TypeName      : 'Approval Step',
    TypeNamePlural: 'Approval Steps',
    Title         : { Value: stepName },
  },
  UI.LineItem: [
    { Value: stepOrder, Label: 'Priority' },
    { Value: stepName,  Label: 'Step Name' },
    { Value: amountField, Label: 'Amount Field' },
    { Value: currency,    Label: 'Currency' },
  ],
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'ApprovalLevelsFacet',
      Label : 'Approval Levels',
      Target: 'levels/@UI.LineItem',
    },
  ],
);

annotate service.ApprovalLevels with @(
  UI.LineItem: [
    { Value: levelOrder,      Label: 'Level' },
    { Value: levelLabel,      Label: 'Label' },
    { Value: ifAmountExceeds, Label: 'If Amount Exceeds' },
    { Value: approverEmail,   Label: 'Approver Email' },
  ],
);

annotate service.CheckConditionSteps with @(
  UI.HeaderInfo: {
    TypeName      : 'Check Condition Step',
    TypeNamePlural: 'Check Condition Steps',
    Title         : { Value: stepName },
  },
  UI.LineItem: [
    { Value: stepOrder, Label: 'Priority' },
    { Value: stepName,  Label: 'Step Name' },
  ],
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'ConditionsFacet',
      Label : 'Conditions',
      Target: 'conditions/@UI.LineItem',
    },
  ],
);

annotate service.ConditionRows with @(
  UI.LineItem: [
    { Value: rowOrder,  Label: '#' },
    { Value: manualfield,  Label: 'Manual Attribute' },
    { Value: attribute, Label: 'Attribute' },
    { Value: operator,  Label: 'Operator' },
    { Value: value,     Label: 'Value' },
  ],
);

// attribute dropdown — backed by the ConditionAttributes code-list
// entity. code = actual payload field name (e.g. "CompanyCode"),
// matched at rule-evaluation time against payload[attribute]; name =
// display label shown in the dropdown (e.g. "Company Code").
annotate service.ConditionRows with {
  attribute @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      Label         : 'Attribute',
      CollectionPath: 'ConditionAttributes',
      Parameters: [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: attribute,
          ValueListProperty: 'code',
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name',
        },
      ],
    },
  );
};

// operator dropdown — backed by the ConditionOperators code-list
// entity (db/schema.cds + srv/rules-service.cds), same proven
// pattern as toleranceKey_ID below. Common.ValueList with a real
// CollectionPath renders reliably as an inline Select; relying on
// Validation.AllowedValues + Common.ValueListWithFixedValues alone
// did not render a dropdown in this environment.
annotate service.ConditionRows with {
  operator @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      Label         : 'Operator',
      CollectionPath: 'ConditionOperators',
      Parameters: [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: operator,
          ValueListProperty: 'code',
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name',
        },
      ],
    },
  );
};

annotate service.SetVariablesSteps with @(
  UI.HeaderInfo: {
    TypeName      : 'Set Variables Step',
    TypeNamePlural: 'Set Variables Steps',
    Title         : { Value: stepName },
  },
  UI.LineItem: [
    { Value: stepOrder, Label: 'Priority' },
    { Value: stepName,  Label: 'Step Name' },
  ],
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'VariablesFacet',
      Label : 'Variables',
      Target: 'variables/@UI.LineItem',
    },
  ],
);

annotate service.VariableRows with @(
  UI.LineItem: [
    { Value: rowOrder, Label: '#' },
    { Value: keys,     Label: 'Key' },
    { Value: value,    Label: 'Value' },
  ],
);

annotate service.ApiMappingSteps with @(
  UI.HeaderInfo: {
    TypeName      : 'API Mapping Step',
    TypeNamePlural: 'API Mapping Steps',
    Title         : { Value: stepName },
  },
  UI.LineItem: [
    { Value: stepOrder,   Label: 'Priority' },
    { Value: stepName,    Label: 'Step Name' },
    { Value: sourceType,  Label: 'Source Type' },
    { Value: method,      Label: 'Method' },
    { Value: destination, Label: 'Destination' },
    { Value: serviceUrl,  Label: 'Service URL' },
  ],
  UI.FieldGroup #GeneratedGroup: {
    Data: [
      { Value: stepOrder,   Label: 'Priority' },
      { Value: stepName,    Label: 'Step Name' },
      { Value: sourceType,  Label: 'Source Type' },
      { Value: method,      Label: 'Method' },
      { Value: destination, Label: 'Destination' },
      { Value: serviceUrl,  Label: 'Service URL' },
    ],
  },
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'GeneratedFacet1',
      Label : 'General Information',
      Target: '@UI.FieldGroup#GeneratedGroup',
    },
  ],
);

// sourceType / method / destination dropdowns — each backed by its
// own code-list entity (SourceTypes, HttpMethods, ApiDestinations),
// same Common.ValueList + CollectionPath pattern as toleranceKey_ID.
annotate service.ApiMappingSteps with {
  sourceType @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      Label         : 'Source Type',
      CollectionPath: 'SourceTypes',
      Parameters: [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: sourceType,
          ValueListProperty: 'code',
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name',
        },
      ],
    },
  );
  method @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      Label         : 'Method',
      CollectionPath: 'HttpMethods',
      Parameters: [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: method,
          ValueListProperty: 'code',
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name',
        },
      ],
    },
  );
  destination @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      Label         : 'Destination',
      CollectionPath: 'ApiDestinations',
      Parameters: [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: destination,
          ValueListProperty: 'code',
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name',
        },
      ],
    },
  );
};

// ── AI Mapping — commented out per request. Entity/backend logic is
// untouched; this only removes its UI annotations (and, above, its
// facet on the Rule Object Page), so it renders with default/no
// customization if ever re-enabled. Uncomment to restore.
// annotate service.AiMappingSteps with @(
//   UI.HeaderInfo: {
//     TypeName      : 'AI Mapping Step',
//     TypeNamePlural: 'AI Mapping Steps',
//     Title         : { Value: stepName },
//   },
//   UI.LineItem: [
//     { Value: stepOrder,   Label: 'Priority' },
//     { Value: stepName,    Label: 'Step Name' },
//     { Value: modelId,     Label: 'Model ID' },
//     { Value: outputField, Label: 'Output Field' },
//   ],
//   UI.FieldGroup #GeneratedGroup: {
//     Data: [
//       { Value: stepOrder,   Label: 'Priority' },
//       { Value: stepName,    Label: 'Step Name' },
//       { Value: modelId,     Label: 'Model ID' },
//       { Value: prompt,      Label: 'Prompt' },
//       { Value: outputField, Label: 'Output Field' },
//     ],
//   },
//   UI.Facets: [
//     {
//       $Type : 'UI.ReferenceFacet',
//       ID    : 'GeneratedFacet1',
//       Label : 'General Information',
//       Target: '@UI.FieldGroup#GeneratedGroup',
//     },
//   ],
// );

annotate service.FieldMappingSteps with @(
  UI.HeaderInfo: {
    TypeName      : 'Field Mapping Step',
    TypeNamePlural: 'Field Mapping Steps',
    Title         : { Value: stepName },
  },
  UI.LineItem: [
    { Value: stepOrder, Label: 'Priority' },
    { Value: stepName,  Label: 'Step Name' },
  ],
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'FieldMappingRowsFacet',
      Label : 'Field Mappings',
      Target: 'fieldMappings/@UI.LineItem',
    },
    // Technical Components facet removed per request — entity/
    // annotations for TechnicalComponentRows below are left intact
    // and unused; only the tab on this Object Page is gone.
  ],
);

annotate service.FieldMappingRows with @(
  UI.LineItem: [
    { Value: rowOrder,    Label: '#' },
    { Value: sourceField, Label: 'Target Field' },
    { Value: targetField, Label: 'API Field' },
    { Value: ruleType,    Label: 'Rule Type' },
  ],
);

// ruleType dropdown — backed by the FieldRuleTypes code-list entity,
// same Common.ValueList + CollectionPath pattern as toleranceKey_ID.
annotate service.FieldMappingRows with {
  ruleType @(
    Common.ValueListWithFixedValues: true,
    Common.ValueList: {
      Label         : 'Rule Type',
      CollectionPath: 'FieldRuleTypes',
      Parameters: [
        {
          $Type            : 'Common.ValueListParameterInOut',
          LocalDataProperty: ruleType,
          ValueListProperty: 'code',
        },
        {
          $Type            : 'Common.ValueListParameterDisplayOnly',
          ValueListProperty: 'name',
        },
      ],
    },
  );
};

annotate service.TechnicalComponentRows with @(
  UI.LineItem: [
    { Value: rowOrder,     Label: '#' },
    { Value: functionCds,  Label: 'Function (CDS)' },
    { Value: programLogic, Label: 'Program Logic' },
  ],
);

annotate service.CallActionSteps with @(
  UI.HeaderInfo: {
    TypeName      : 'Call Action Step',
    TypeNamePlural: 'Call Action Steps',
    Title         : { Value: stepName },
  },
  UI.LineItem: [
    { Value: stepOrder,   Label: 'Priority' },
    { Value: stepName,    Label: 'Step Name' },
    { Value: functionCds, Label: 'Function (CDS)' },
  ],
  UI.FieldGroup #GeneratedGroup: {
    Data: [
      { Value: stepOrder,    Label: 'Priority' },
      { Value: stepName,     Label: 'Step Name' },
      { Value: functionCds,  Label: 'Function (CDS)' },
      { Value: programLogic, Label: 'Program Logic' },
    ],
  },
  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'GeneratedFacet1',
      Label : 'General Information',
      Target: '@UI.FieldGroup#GeneratedGroup',
    },
  ],
);

// ── Configuration — commented out per request (see AI Mapping note
// above; same rationale, uncomment to restore).
// annotate service.ConfigurationSteps with @(
//   UI.HeaderInfo: {
//     TypeName      : 'Configuration Step',
//     TypeNamePlural: 'Configuration Steps',
//     Title         : { Value: stepName },
//   },
//   UI.LineItem: [
//     { Value: stepOrder,      Label: 'Priority' },
//     { Value: stepName,       Label: 'Step Name' },
//     { Value: keyFieldSap,    Label: 'Key Field (SAP)' },
//     { Value: outputVariable, Label: 'Output Variable' },
//   ],
//   UI.Facets: [
//     {
//       $Type : 'UI.ReferenceFacet',
//       ID    : 'ConfigTargetFieldsFacet',
//       Label : 'Target Fields',
//       Target: 'targetFields/@UI.LineItem',
//     },
//     {
//       $Type : 'UI.ReferenceFacet',
//       ID    : 'ConfigEntriesFacet',
//       Label : 'Entries',
//       Target: 'entries/@UI.LineItem',
//     },
//   ],
// );
//
// annotate service.ConfigTargetFields with @(
//   UI.LineItem: [
//     { Value: rowOrder,     Label: '#' },
//     { Value: sapField,     Label: 'SAP Field' },
//     { Value: displayLabel, Label: 'Display Label' },
//     { Value: isRequired,   Label: 'Required' },
//   ],
// );
//
// annotate service.ConfigEntryRows with @(
//   UI.LineItem: [
//     { Value: rowOrder,    Label: '#' },
//     { Value: keyValue,    Label: 'Key Value' },
//     { Value: fieldValues, Label: 'Field Values (JSON)' },
//   ],
// );

// ── Tolerance Limit — commented out per request (see AI Mapping note
// above; same rationale, uncomment to restore). Note: ToleranceKeys
// (the standalone master-data list/object page reached via the
// "Manage Tolerance Keys" button) is a SEPARATE entity from
// ToleranceLimitSteps and is untouched below — only the Tolerance
// Limit tab on the Rule Object Page is disabled here.
// annotate service.ToleranceLimitSteps with @(
//   UI.HeaderInfo: {
//     TypeName      : 'Tolerance Limit Step',
//     TypeNamePlural: 'Tolerance Limit Steps',
//     Title         : { Value: stepName },
//   },
//   UI.LineItem: [
//     { Value: stepOrder,                  Label: 'Priority' },
//     { Value: stepName,                   Label: 'Step Name' },
//     { Value: toleranceKey_ID,            Label: 'Key' },
//     { Value: lowerAmount,                Label: 'Limit Amount (Lower)' },
//     { Value: upperAmount,                Label: 'Limit Amount (Upper)' },
//     { Value: lowerPercent,               Label: 'Limit %age (Lower)' },
//     { Value: upperPercent,               Label: 'Limit %age (Upper)' },
//     { Value: action,                     Label: 'Action on Breach' },
//   ],
//   UI.FieldGroup #GeneratedGroup: {
//     Data: [
//       { Value: stepOrder,                 Label: 'Priority' },
//       { Value: stepName,                  Label: 'Step Name' },
//       { Value: toleranceKey_ID,           Label: 'Key' },
//       { Value: lowerAmount,               Label: 'Limit Amount (Lower)' },
//       { Value: upperAmount,               Label: 'Limit Amount (Upper)' },
//       { Value: lowerPercent,              Label: 'Limit %age (Lower)' },
//       { Value: upperPercent,              Label: 'Limit %age (Upper)' },
//       { Value: action,                    Label: 'Action on Breach' },
//     ],
//   },
//   UI.Facets: [
//     {
//       $Type : 'UI.ReferenceFacet',
//       ID    : 'GeneratedFacet1',
//       Label : 'General Information',
//       Target: '@UI.FieldGroup#GeneratedGroup',
//     },
//   ],
// );
//
// annotate service.ToleranceLimitSteps with {
//   toleranceKey_ID @(
//     Common.ValueListWithFixedValues: true,
//     Common.ValueList: {
//       Label         : 'Tolerance Key',
//       CollectionPath: 'ToleranceKeys',
//       Parameters: [
//         {
//           $Type            : 'Common.ValueListParameterInOut',
//           LocalDataProperty: toleranceKey_ID,
//           ValueListProperty: 'ID',
//         },
//         {
//           $Type            : 'Common.ValueListParameterDisplayOnly',
//           ValueListProperty: 'toleranceKey',
//         },
//         {
//           $Type            : 'Common.ValueListParameterDisplayOnly',
//           ValueListProperty: 'description',
//         },
//       ],
//     },
//   );
// };

// ── ToleranceKeys — fixed per key, set once, no limit values.
// NOT commented out: this is the standalone master-data list reached
// via the "Manage Tolerance Keys" button on the Rules List Report,
// separate from the (now-disabled) Tolerance Limit tab above.
annotate service.ToleranceKeys with @(
  UI.HeaderInfo: {
    TypeName      : 'Tolerance Key',
    TypeNamePlural: 'Tolerance Keys',
    Title         : { Value: toleranceKey },
    Description   : { Value: description }
  },

  UI.CreateHidden: false,

  UI.DeleteHidden: false,

  UI.UpdateHidden: false,

  UI.LineItem: [
    { Value: toleranceKey,   Label: 'Tolerance Key' },
    { Value: description,    Label: 'Description' },
    { Value: currency,       Label: 'Currency' },
    { Value: checkField,     Label: 'Source Field' },
    { Value: referenceField, Label: 'Target Field' }
  ],

  UI.FieldGroup #GeneratedGroup: {
    Data: [
      { Value: toleranceKey,   Label: 'Tolerance Key' },
      { Value: description,    Label: 'Description' },
      { Value: currency,       Label: 'Currency' },
      { Value: checkField,     Label: 'Source Field' },
      { Value: referenceField, Label: 'Target Field' }
    ]
  },

  UI.Facets: [
    {
      $Type : 'UI.ReferenceFacet',
      ID    : 'GeneratedFacet1',
      Label : 'General Information',
      Target: '@UI.FieldGroup#GeneratedGroup'
    }
  ],

  UI.SelectionFields: [ toleranceKey ],

  Capabilities.InsertRestrictions.Insertable: true,
  Capabilities.DeleteRestrictions.Deletable: true,
  Capabilities.UpdateRestrictions.Updatable: true
);

// Common.Label drives the label shown in the "specify key" dialog
// when creating a new Tolerance Key — UI.LineItem/FieldGroup labels
// (set above) only apply to table columns and form sections, not
// this dialog.
annotate service.ToleranceKeys with {
  toleranceKey @Common.Label: 'Tolerance Key';
};
