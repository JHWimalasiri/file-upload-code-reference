
async function createSchemaCountryExclusions() {

    return {
        'columns': [
            'Goods code',
            'Measure type',
            'Meas. type code',
            'Excluded country'
        ],
        'Goods code': {
            prop: 'hs6p_code',
            type: (value) => {
                if ((typeof value === 'string')) {
                    const digits = value.replace(/\D/g,'');

                    if (digits.length >= 10) {
                        let applicableCode = '00';
                        const hsSubCodes = digits.padEnd(10, '0').slice(0, 10).match(/.{1,2}/g);
                        const hsCodeChapter = hsSubCodes[0];
                        const hsCodeHeading = hsCodeChapter + hsSubCodes[1];
                        const hsCodeSubHeading = hsCodeHeading + hsSubCodes[2];
                        const hsCodeCNSubHeading = hsCodeSubHeading + hsSubCodes[3];
                        const hsCodeSubCNSubHeading = hsCodeCNSubHeading + hsSubCodes[4];

                        const codes =  [hsCodeChapter, hsCodeHeading, hsCodeSubHeading, hsCodeCNSubHeading, hsCodeSubCNSubHeading];

                        for (let i = codes.length-1; i >= 0; i--) {
                            const subCode = codes[i].slice(-2);
                            if (subCode !== '00') {
                                applicableCode = codes[i];
                                break;
                            }
                        }
                        return applicableCode;
                    } else {
                        throw new Error('invalid')
                    }
                } else {
                    throw new Error('invalid');
                }
            },
            required: true

        },
        'Measure type': {
            prop: 'measure_type',
            type: String,
            required: true

        },
        'Meas. type code': {
            prop: 'measure_type_code',
            type: String,
            required: true

        },
        'Excluded country': {
            prop: 'excluded_country',
            type: String,
            required: true

        }
    }
}

module.exports = {
    createSchemaCountryExclusions
};