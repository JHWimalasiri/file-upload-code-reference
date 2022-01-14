const { assert, expect } = require('chai');
const validate = require('./../src/validate_data');
const moment = require('moment');

describe("Ref data upload validation", () => {

    const sampleSchema = {
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
            oneOf: [ 'AT', 'FI']
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

    const sampleData = [
        {
            "Member State": "AT - Austria",
            "Type": "STANDARD",
            "Rate": 20
        },
        {
            "Member State": "AT - Austria",
            "Type": "REDUCED_error",
            "Rate": 10,
            "CPA Code": "79.90.39",
            "CPA Code Description": "ADMINISTRATIVE AND SUPPORT SERVICES / Travel agency, tour operator and other reservation services and related services / Other reservation services and related services",
            "Category": "Admission to shows, theatres, circuses, fairs, amusement parks, concerts, museums, zoos, cinemas, exhibitions and similar cultural events and facilities",
            "Comments": "if not exempted: theaters, concerts, museums, zoos or botanical gardens if carried out by non-profit organizations temporary reduced rate 5% from 1th July to 31th December 2020"
        },
        {
            "Member State": "AT - Austria",
            "Type": "REDUCED",
            "Rate": 13,
            "CN Code": "0102",
            "CN Code Description": "SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS / CHAPTER 1 - LIVE ANIMALS / Live bovine animals",
            "Category": "Admission to shows, theatres, circuses, fairs, amusement parks, concerts, museums, zoos, cinemas, exhibitions and similar cultural events and facilities",
            "Comments": "as from 1/5/2016: Annex 2 to the Austrian VAT Act 1994 contains a list of goods falling under the reduced rate of 13% e.g. life-stock, living plants"
        },
        {
            "Member State": "AT - Austria",
            "Type": "REDUCED",
            "Rate": 13,
            "CN Code": "0103",
            "CN Code Description": "SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS / CHAPTER 1 - LIVE ANIMALS / Live swine",
            "Category": "Admission to shows, theatres, circuses, fairs, amusement parks, concerts, museums, zoos, cinemas, exhibitions and similar cultural events and facilities",
            "Comments": "as from 1/5/2016: Annex 2 to the Austrian VAT Act 1994 contains a list of goods falling under the reduced rate of 13% e.g. life-stock, living plants"
        },
        {
            "Member State": "AT - Austria",
            "Type": "REDUCED",
            "Rate": 15,
            "CPA Code": "58.11.2",
            "CPA Code Description": "INFORMATION AND COMMUNICATION SERVICES / Publishing services / Publishing services of books, periodicals and other publishing services / Book publishing services / Books on disk, tape or other physical media",
            "Category": "Supply, including on loan by libraries, of books, newspapers and periodicals either on physical means of support or supplied electronically or both",
            "Comments": "electronically supplied publications, temporary reduced rate 5% from 1th July to 31th December 2020"
        },
        {
            "Member State": "AT - Austria",
            "Type": "REDUCED",
            "CN Code": "0103",
            "CN Code Description": "SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS / CHAPTER 1 - LIVE ANIMALS / Live swine",
            "Category": "Admission to shows, theatres, circuses, fairs, amusement parks, concerts, museums, zoos, cinemas, exhibitions and similar cultural events and facilities",
            "Comments": "as from 1/5/2016: Annex 2 to the Austrian VAT Act 1994 contains a list of goods falling under the reduced rate of 13% e.g. life-stock, living plants"
        }
    ];

    describe("Validate data", () => {

        it('Should validate data and return rows and errors', async () => {
            const { rows , errors} = await validate.validateData(sampleData, sampleSchema);

            expect(rows).to.have.same.deep.members(
                [
                    {
                        "country": "AT",
                        "rate_type": "STANDARD",
                        "rate": 20
                    },
                    {
                        "country": "AT",
                        "rate_type": "REDUCED",
                        "rate": 13,
                        "hs6p_code": "0102",
                        "code_description": "SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS / CHAPTER 1 - LIVE ANIMALS / Live bovine animals",
                        "category": "Admission to shows, theatres, circuses, fairs, amusement parks, concerts, museums, zoos, cinemas, exhibitions and similar cultural events and facilities",
                        "comments": "as from 1/5/2016: Annex 2 to the Austrian VAT Act 1994 contains a list of goods falling under the reduced rate of 13% e.g. life-stock, living plants"
                    },
                    {
                        "country": "AT",
                        "rate_type": "REDUCED",
                        "rate": 13,
                        "hs6p_code": "0103",
                        "code_description": "SECTION I - LIVE ANIMALS; ANIMAL PRODUCTS / CHAPTER 1 - LIVE ANIMALS / Live swine",
                        "category": "Admission to shows, theatres, circuses, fairs, amusement parks, concerts, museums, zoos, cinemas, exhibitions and similar cultural events and facilities",
                        "comments": "as from 1/5/2016: Annex 2 to the Austrian VAT Act 1994 contains a list of goods falling under the reduced rate of 13% e.g. life-stock, living plants"
                    },
                    {
                        "country": "AT",
                        "rate_type": "REDUCED",
                        "rate": 15,
                        "cpa_code": "58112",
                        "code_description": "INFORMATION AND COMMUNICATION SERVICES / Publishing services / Publishing services of books, periodicals and other publishing services / Book publishing services / Books on disk, tape or other physical media",
                        "category": "Supply, including on loan by libraries, of books, newspapers and periodicals either on physical means of support or supplied electronically or both",
                        "comments": "electronically supplied publications, temporary reduced rate 5% from 1th July to 31th December 2020"
                    }
                ]
            );

            expect(errors).to.have.same.deep.members(
                [
                    {
                        "error": "invalid",
                        "row": 3,
                        "column": "Type",
                        "value": "REDUCED_error"
                    },
                    {
                        "error": "required",
                        "row": 7,
                        "column": "Rate",
                        "value": null
                    }
                ]
            );
        });

        it('Should throw an error - invalid data', () => {
            const data = [
                {
                    "country": "EE - Estonia",
                    "col1": "test1",
                    "col2": "test1"
                },
                {
                    "country": "FI - Finland",
                    "col1": "test2",
                    "col2": "test2"
                },
                {
                    "country": "DK - Denmark",
                    "col1": "test3",
                    "col2": "test3"
                }
            ];

            try {
                expect(validate.validateData(data, sampleSchema));
            } catch (error) {
                assert.equal(error.message, 'File contains invalid data.');
            }
        })
    });

    describe("Parse value", () => {

        it('Should return parse value when type not given', () => {
            const inputValue = 25;
            const schemaEntry = {
                "prop": "numberCol"
            };
            const { value } = validate.parseValue(inputValue, schemaEntry);
            expect(value).to.be.equal(25);
        });

        it('Should return parse value for given type Number', () => {
            const inputValue = 25;
            const schemaEntry = {
                "prop": "numberCol",
                "type": Number
            };
            const { value } = validate.parseValue(inputValue, schemaEntry);
            expect(value).to.be.equal(25);
        });

        it('Should return the error when the value is not the given type', () => {
            const inputValue = 'text value';
            const schemaEntry = {
                "prop": "numberCol",
                "type": Number
            };
            const { error } = validate.parseValue(inputValue, schemaEntry);
            expect(error).to.be.equal('invalid');
        });

        it('Should return the value when it is one of the given values', () => {
            const inputValue = 'AT';
            const schemaEntry = {
                "prop": "country",
                "type": String,
                "oneOf": [
                    "AT", "FI", "EE"
                ]
            };
            const { value } = validate.parseValue(inputValue, schemaEntry);
            expect(value).to.be.equal('AT');
        });

        it('Should return an error when the value is not one of the given values', () => {
            const inputValue = 'DK';
            const schemaEntry = {
                "prop": "country",
                "type": String,
                "oneOf": [
                    "AT", "FI", "EE"
                ]
            };
            const { error } = validate.parseValue(inputValue, schemaEntry);
            expect(error).to.be.equal('invalid');
        });
    });

    describe("ParseValueOfType", () => {

        it('Should return value for type String', () => {
            const { value } = validate.parseValueOfType('text', String);
            expect(value).to.be.equal('text');
        });

        it('Should return value for type Number', () => {
            const { value } = validate.parseValueOfType(14, Number);
            expect(value).to.be.equal(14);
        });

        it('Should return value for type boolean', () => {
            const { value } = validate.parseValueOfType(true, Boolean);
            expect(value).to.be.equal(true);
        });

        it('Should return error for invalid type Boolean', () => {
            const { error } = validate.parseValueOfType('true', Boolean);
            expect(error).to.be.equal('invalid');
        });

        it('Should return value for type Date', () => {
            const { value } = validate.parseValueOfType('03/24/2021', Date);
            expect(value).to.be.equal('03/24/2021');
        });

        it('Should return error for invalid type Date', () => {
            const { error } = validate.parseValueOfType('13/24/2021', Date);
            expect(error).to.be.equal('invalid');
        });

        it('Should return parse custom value for type function : country', () => {
            const type = (value) => {
                if ((typeof value === 'string')) {
                    const country  = value.split(' - ');
                    return country[0];
                } else {
                    throw new Error('invalid');
                }};
            const { value } = validate.parseValueOfType('AT - Austria', type);
            expect(value).to.be.equal('AT');
        });

        it('Should throw an error for unknown schema types', () => {
            try {
                expect(validate.parseValueOfType('text', 'Email'));
            } catch (error) {
                assert.equal(error.message, 'Unknown schema type: Email');
            }
        });

        describe('Parse custom value for type : custom duty rate', () => {
            const type = (value) => {
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
            };

            it('Should return parse custom value for type function : custom duty rate', () => {
                const { value } = validate.parseValueOfType('0.130 % ', type);
                expect(value).to.be.equal(0.13);
            });

            it('Should throw an error for invalid custom duty rate', () => {
                const { error }  = validate.parseValueOfType('0.130', type);
                expect(error).to.be.equal('invalid');
            });

            it('Should throw an error for invalid custom duty rate type', () => {
                const { error }  = validate.parseValueOfType(0.130, type);
                expect(error).to.be.equal('invalid');
            })
        });

        describe('Parse custom value for type : date', () => {
            const type = (value) => {
                const date = moment(value);
                if (date.isValid()) {
                    if (moment().diff(date) < 0) {
                        return value;
                    } else {
                        throw new Error('invalid');
                    }
                } else {
                    throw new Error('invalid');
                }};

            it('Should return parse custom value for type function date', () => {
                const { value } = validate.parseValueOfType('2030-12-30T18:29:28.000Z', type);
                expect(value).to.be.equal('2030-12-30T18:29:28.000Z');
            });

            it('Should return an error for past dates', () => {
                const { error } = validate.parseValueOfType('2020-12-30T18:29:28.000Z', type);
                expect(error).to.be.equal('invalid');
            });

            it('Should return an error for invalid date types', () => {
                const { error } = validate.parseValueOfType('2020-15-30', type);
                expect(error).to.be.equal('invalid');
            });
        });

        describe('Parse custom value for type : hs6p code', () => {
            const type = (value) => {
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
            };

            it('Should parse custom value for hs6p code', () => {
                const { value } = validate.parseValueOfType('0301190000', type);
                expect(value).to.be.equal('030119');
            });

            it('Should throw error for invalid hs6p code', () => {
                const { error } = validate.parseValueOfType('03011', type);
                expect(error).to.be.equal('invalid');
            });

            it('Should throw error for invalid hs6p code type', () => {
                const { error } = validate.parseValueOfType(1234567890, type);
                expect(error).to.be.equal('invalid');
            });
        })

    });

    describe("Validate schemas", () => {

        it('Should return error for columns with no schema entry', () => {
            const schema = {
                'columns' : [
                    'Goods code',
                    'Hier. Pos.',
                    'Description'
                ],
                'Goods code': {
                    prop: 'hs6p_code',
                    type: (value) => {
                        if ((typeof value === 'string')) {
                            return value.replace(/\D/g,'');
                        } else {
                            throw new Error('invalid');
                        }
                    },
                    required: true

                },
                'Description': {
                    prop: 'description',
                    type: String,
                    required: true

                }
            };
            try {
                expect(validate.validateSchema(schema));
            } catch (error) {
                assert.equal(error.message, 'Schema entry not defined for column "Hier. Pos.".');
            }
        });

        it('Should return error for schema entries with no prop defined', () => {
            const schema = {
                'columns' : [
                    'Goods code',
                    'Description'
                ],
                'Goods code': {
                    prop: 'hs6p_code',
                    type: (value) => {
                        if ((typeof value === 'string')) {
                            return value.replace(/\D/g,'');
                        } else {
                            throw new Error('invalid');
                        }
                    },
                    required: true

                },
                'Description': {
                    type: String,
                    required: true

                }
            };
            try {
                expect(validate.validateSchema(schema));
            } catch (error) {
                assert.equal(error.message, '"prop" not defined for schema entry "Description".');
            }
        });

        it('Should return error for schemas with no columns defined', () => {
            const schema = {
                'Goods code': {
                    prop: 'hs6p_code',
                    type: (value) => {
                        if ((typeof value === 'string')) {
                            return value.replace(/\D/g,'');
                        } else {
                            throw new Error('invalid');
                        }
                    },
                    required: true

                },
                'Description': {
                    type: String,
                    required: true

                }
            };
            try {
                expect(validate.validateSchema(schema));
            } catch (error) {
                assert.equal(error.message, 'Columns not defined for schema.');
            }
        });
    })
});