using LockboxRulesService as service from '../../srv/rules-service';

annotate service.ReasonCodes with @(

    UI.HeaderInfo : {
        TypeName       : 'Reason Code',
        TypeNamePlural : 'Reason Codes',
        Title          : { Value : Code },
        Description    : { Value : RemittancePattern },
    },

    UI.Identification : [
        { Value : Code },
    ],

    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Code',
                Value : Code,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Remittance Pattern',
                Value : RemittancePattern,
            },
            {
                $Type : 'UI.DataField',
                Label : 'SAP Reason',
                Value : SAPReason,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Dispute Type',
                Value : DisputeType,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Owner',
                Value : Owner,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Auto-Create',
                Value : AutoCreate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'GL',
                Value : GL,
            },
        ],
    },

    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],

    UI.LineItem : [
        {
                $Type : 'UI.DataField',
                Label : 'Code',
                Value : Code,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Remittance Pattern',
                Value : RemittancePattern,
            },
            {
                $Type : 'UI.DataField',
                Label : 'SAP Reason',
                Value : SAPReason,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Dispute Type',
                Value : DisputeType,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Owner',
                Value : Owner,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Auto-Create',
                Value : AutoCreate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'GL',
                Value : GL,
            }
        
    ],
);

annotate service.ReasonCodes with {
    Code              @title : 'Code';
    RemittancePattern @title : 'Remittance Pattern';
    SAPReason         @title : 'SAP Reason';
    DisputeType       @title : 'Dispute Type';
    Owner             @title : 'Owner';
    AutoCreate        @title : 'Auto-Create';
    GL                @title : 'GL';
};