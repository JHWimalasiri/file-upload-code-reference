const { getCountryList} = require("./../query");

async function createSchemaVatRates() {
    //Get country list for validation
    const countries = [];
    const result = await getCountryList();
    const {rows} = result;
    if (rows) {
        rows.forEach( country => {
            countries.push(country.iso_alpha_2);
        });
    }

    return  {
        'columns' : [
            'Member State',
            'Type',
            'Rate',
            'CN Code',
            'CN Code Description',
            'CPA Code',
            'CPA Code Description',
            'Category',
            'Comments',
            'Region'
        ],
        'Member State': {
            prop: 'country',
            type: (value) => {
                if ((typeof value === 'string')) {
                    const country  = value.split(' - ');
                    return country[0];
                } else {
                    throw new Error('invalid');
                }
            },
            required: true,
            oneOf: countries
        },
        'Type': {
            prop: 'rate_type',
            type: String,
            required: true,
            oneOf: [
                'STANDARD',
                'REDUCED'
            ]
        },
        'Rate': {
            prop: 'rate',
            type: (value) => {
                if (!(typeof value === 'number')) {
                    if (value === 'EXEMPTED' || value === 'NOT_APPLICABLE' || value === 'OUT_OF_SCOPE') {
                        throw new Error('warning')
                    } else {
                        throw new Error('invalid')
                    }
                }
                return value;
            },
            required: true
        },
        'CN Code': {
            prop: 'hs6p_code',
            type: (value) => {
                if ((typeof value === 'string')) {
                    return value.replace(/\D/g,'');
                } else {
                    throw new Error('invalid');
                }
            }

        },
        'CN Code Description': {
            prop: 'code_description',
            type: String

        },
        'CPA Code': {
            prop: 'cpa_code',
            type: (value) => {
                if ((typeof value === 'string')) {
                    return value.replace(/\D/g,'');
                } else {
                    throw new Error('invalid');
                }
            }

        },
        'CPA Code Description': {
            prop: 'code_description',
            type: String

        },
        'Category': {
            prop: 'category',
            type: String

        },
        'Comments': {
            prop: 'comments',
            type: String

        },
        'Region': {
            prop: 'region',
            type: String

        }
    };
}

async function createVatRateList(dataList) {

    let countryVatRatesMap = new Map();
    let excludeRowCount = 0;

    dataList.forEach(data => {
        const key = data.country + data.rate_type + data.rate;
        const countryVatRate = {
            country: data.country,
            rate_type: data.rate_type,
            rate: data.rate,
            items: []
        };

        if (data.hasOwnProperty('hs6p_code')) {

            let countryVatRateItem = [data.hs6p_code, data.code_description, data.category || '', data.comments || ''];

            if (countryVatRatesMap.has(key)) {
                const countryVatRateValue = countryVatRatesMap.get(key);
                const items = countryVatRateValue.items;
                items.push(countryVatRateItem);
                countryVatRatesMap.set(key, countryVatRateValue);
            } else {
                const items = countryVatRate.items;
                items.push(countryVatRateItem);
                countryVatRatesMap.set(key, countryVatRate);
            }
        } else {
            if (data.hasOwnProperty('cpa_code')) {
                excludeRowCount += 1;
            } else {
                if (!countryVatRatesMap.has(key)) {
                    countryVatRatesMap.set(key, countryVatRate);
                }
            }

        }
    });

    return  {
        excludeRowCount : excludeRowCount,
        vatRateItems : Array.from(countryVatRatesMap.values())
    };

}

module.exports = {
    createSchemaVatRates,
    createVatRateList
};
