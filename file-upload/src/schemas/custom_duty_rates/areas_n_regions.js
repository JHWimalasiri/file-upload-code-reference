const { getCountryList} = require("./../../query");

async function createSchemaAreasRegions() {

    //Get country list for validation
    const {rows} = await getCountryList();
    const countries = (rows || []).map(({iso_alpha_2})=>iso_alpha_2);

    return {
        'columns': [
            'Country group',
            'Member country',
            'Description'
        ],
        'Country group': {
            prop: 'country_group_code',
            type: String,
            required: true

        },
        'Member country': {
            prop: 'country_code',
            type: String,
            required: true,
            oneOf: countries

        },
        'Description': {
            prop: 'country',
            type: String,
            required: true

        }
    }
}

module.exports = {
    createSchemaAreasRegions
};
