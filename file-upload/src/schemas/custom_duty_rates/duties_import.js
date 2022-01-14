const moment = require('moment');
const { getHS6PList } = require("./../../query");

async function createSchemaDutiesImport() {

    //Get hs6p code list for validation
    const {rows} = await getHS6PList();
    const hs6pCodes = (rows || []).map(({hs6p_code})=>hs6p_code);

    return {
        'columns' : [
            'Goods code',
            'Start date',
            'End date',
            'Origin',
            ' Measure type',
            'Legal base',
            'Duty',
            'Origin code',
            ' Meas. type code'
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
                            // console.log(codes[i] + ' - ' +subCode + ' - '+ i);
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
            required: true,
            oneOf: hs6pCodes

        },
        'Start date': {
            prop: 'start_date',
            type: (value) => {
                const date = moment(value);
                if (date.isValid()) {
                    return value
                } else {
                    throw new Error('invalid');
                }
            },
            required: true

        },
        'End date': {
            prop: 'end_date',
            type: (value) => {
                const date = moment(value);
                if (date.isValid()) {
                    if (moment().diff(date) < 0) {
                        return value;
                    } else {
                        throw new Error('invalid');
                    }
                } else {
                    throw new Error('invalid');
                }
            }

        },
        'Origin': {
            prop: 'origin_country',
            type: String,
            required: true

        },
        ' Measure type': {
            prop: 'measure_type',
            type: String,
            required: true

        },
        'Legal base': {
            prop: 'legal_base',
            type: String,
            required: true

        },
        'Duty': {
            prop: 'customs_duty',
            type: (value) => {
                if (typeof value === 'string') {
                    const str = value.replace(/\s/g, '');
                    const regex = new RegExp('^([0-9]{1,})[.]([0-9]{3})%$');
                    if (regex.test(str)) {
                        const rate = str.split('%');
                        return (parseFloat(rate[0]))
                    } else {
                        throw new Error('invalid');
                    }
                } else {
                    throw new Error('invalid');
                }
            },
            required: true

        },
        'Origin code': {
            prop: 'origin_code',
            type: String,
            required: true

        },
        ' Meas. type code': {
            prop: 'measure_type_code',
            type: String,
            required: true

        }
    }
}

module.exports = {
    createSchemaDutiesImport
};
