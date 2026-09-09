using LockboxRulesService as service from '../../srv/rules-service';

annotate service.Configuration with @(

    UI.HeaderInfo : {
        TypeName       : 'Configuration',
        TypeNamePlural : 'Configurations',
        Title          : { Value : Lockbox },
        Description    : { Value : Company },
    },

    UI.Identification : [
        { Value : Lockbox },
    ],

    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'Company Code',
                Value : Company,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Lockbox',
                Value : Lockbox,
            },
            {
                $Type : 'UI.DataField',
                Label : 'LockboxBatch',
                Value : LockboxBatch,
            },
            {
                $Type : 'UI.DataField',
                Label : 'LockboxDestination',
                Value : LockboxDestination,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Currency',
                Value : Currency,
            },
            {
                $Type : 'UI.DataField',
                Label : 'House Bank',
                Value : HouseBank,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Channel',
                Value : Channel,
            },
            {
                $Type : 'UI.DataField',
                Label : 'Active',
                Value : Active,
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
            Label : 'Company Code',
            Value : Company,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Lockbox',
            Value : Lockbox,
        },
        {
            $Type : 'UI.DataField',
            Label : 'LockboxBatch',
            Value : LockboxBatch,
        },
        {
            $Type : 'UI.DataField',
            Label : 'LockboxDestination',
            Value : LockboxDestination,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Currency',
            Value : Currency,
        },
        {
            $Type : 'UI.DataField',
            Label : 'House Bank',
            Value : HouseBank,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Channel',
            Value : Channel,
        },
        {
            $Type : 'UI.DataField',
            Label : 'Active',
            Value : Active,
            Criticality : ActiveCriticality,
        },
    ],
);

annotate service.Configuration with {
    Company            @title : 'Company';
    Lockbox            @title : 'Lockbox';
    LockboxBatch       @title : 'Lockbox Batch';
    LockboxDestination @title : 'Lockbox Destination';
    Currency           @title : 'Currency';
    HouseBank          @title : 'House Bank';
    Channel            @title : 'Channel';
    Active             @title : 'Active';
};