const { ServiceBroker } = require("moleculer");
const assert = require('assert');
const schema = require('../src/file_upload.service');
const testSchema = require('../src/test.file_upload.service');
const {insertRow, addVatRateItems, clearVatRates, formatVatRateItems, getCountryList, getHS6PList} = require('../src/query');
const {default: {postgres}} = require('@yyyy-sw/yyyy-db');
const sinon = require('sinon');
const chai = require('chai');
const { stat } = require("fs");
const expect = chai.expect;
const {Readable} = require('stream');
chai.use(require('chai-as-promised'));
const { StatusCodes } = require('http-status-codes');
const {Client} = require('pg');

describe("File upload Service Test", () => {

    beforeEach(() => {

        const stub = sinon.stub(postgres, "execute")
        const now = new Date(new Date('2020-04-07'));
        sinon.stub(Date, 'now').returns(now);

        const date = new Date(Date.now())
        stub.withArgs(sinon.match.has('query', 'insert into hs6p_code("hs6p_code","description") values($1,$2) returning id').and(sinon.match.has("values", ['1234567890', 'Milk']))).resolves({
            statusCode: 200,
            rows: [{id: 1}]
        })
        stub.withArgs(sinon.match.has('query', 'update hs6p_code set "hs6p_code" = $1,"description" = $2,"timestamp" = $3 where id = $4').and(sinon.match.has("values", ['1234567890', 'description', 'timestamp', 1]))).resolves({
            statusCode: 200,
            rows: []
        })

        stub.withArgs(sinon.match.has('query', 'delete from country_vat_item using country_vat_rate where country_vat_rate.is_data_reserved = false and country_vat_item.country_vat_rate_id = country_vat_rate.id')).resolves({statusCode: 200});
        stub.withArgs(sinon.match.has('query', 'delete from country_vat_rate where is_data_reserved = $1')).resolves({statusCode: 200});
        stub.withArgs(sinon.match.has('query', 'select insert_vat_rate_data($1, $2, $3, $4, $5)')).resolves({statusCode: 200});
        stub.withArgs(sinon.match.has('query', 'select iso_alpha_2 from country')).resolves({
            statusCode: 200, rows: [{iso_alpha_2: 'AT'}, {iso_alpha_2: 'AL'}, {iso_alpha_2: 'DZ'}, {iso_alpha_2: 'AS'},
                {iso_alpha_2: 'AD'}, {iso_alpha_2: 'AO'}, {iso_alpha_2: 'AI'}, {iso_alpha_2: 'AQ'},
                {iso_alpha_2: 'AG'}, {iso_alpha_2: 'AR'}, {iso_alpha_2: 'AM'}, {iso_alpha_2: 'AW'},
                {iso_alpha_2: 'NG'}, {iso_alpha_2: 'CO'}, {iso_alpha_2: 'AF'}, {iso_alpha_2: 'BD'}, {iso_alpha_2: 'BF'}]
        });

        stub.withArgs(sinon.match.has('query', 'select update_s10($1, $2, $3)')).resolves({statusCode: 200});
        stub.withArgs(sinon.match.has('query', 'select update_s10($1, $2, $3)')
            .and(sinon.match.has("values", [11, 'S10_11202', true]))).resolves({statusCode: 500});
        stub.withArgs(sinon.match.has('query', 'delete from country_customs_duty_rate')).resolves({statusCode: 200});
        stub.withArgs(sinon.match.has('query', 'select verify_payment($1, $2, $3, $4)')).resolves({
            statusCode: 200,
            rows: []
        })
        stub.withArgs(sinon.match.has('query', 'select verify_payment($1, $2, $3, $4, $5)')).resolves({
            statusCode: 200,
            rows: []
        })
        stub.withArgs(sinon.match.has('query', 'insert into file_upload_job("type","status","progress","response") values($1,$2,$3,$4) returning id')).resolves({
            statusCode: 200,
            rows: [{id: 1}]
        });
        stub.withArgs(sinon.match.has('query', 'update file_upload_job set "progress" = $1,"response" = $2,"last_updated" = $3 where id = $4')).resolves({
            statusCode: 200,
            rows: []
        });
        stub.withArgs(sinon.match.has('query', 'delete from file_upload_job where id = $1 and type = $2 and status = $3').and(sinon.match.has("values", [3, 'custom_duty_rate', 'pending']))).resolves({
            statusCode: 200,
            rows: [],
            rowCount: 1
        });

        const conn = sinon.stub(Client.prototype, "connect");
        conn.resolves();
        const stub2 = sinon.stub(Client.prototype, "query");
        stub2.withArgs('select hs6p_code from hs6p_code', []).resolves({
            rows: [
                {hs6p_code: '020423'}, {hs6p_code: '071335'}, {hs6p_code: '071339'}, {hs6p_code: '071390'}, {hs6p_code: '100610'}, {hs6p_code: '100620'}, {hs6p_code: '10063021'}, {hs6p_code: '10063023'},
            ], rowCount: 8
        });
        stub2.withArgs('delete from country_customs_duty_rate', []).resolves({rows: [], rowCount: 1})
        stub2.withArgs('insert into country_customs_duty_rate(hs6p_code, customs_duty, origin_code, start_date, end_date, measure_type, legal_base, measure_type_code, timestamp) values ($1, $2, $3, $4, $5, $6, $7, $8, $9) on conflict do nothing returning id', sinon.match.any).resolves({
            rows: [],
            rowCount: 1
        });
        stub2.withArgs('insert into country_customs_duty_rate(hs6p_code, customs_duty, origin_code, start_date, end_date, measure_type, legal_base, measure_type_code, timestamp) values ($1, $2, $3, $4, $5, $6, $7, $8, $9), ($10, $11, $12, $13, $14, $15, $16, $17, $18), ($19, $20, $21, $22, $23, $24, $25, $26, $27), ($28, $29, $30, $31, $32, $33, $34, $35, $36) on conflict do nothing returning id', sinon.match.any).resolves({
            rows: [],
            rowCount: 1
        });
        stub2.withArgs('insert into country_customs_duty_rate(hs6p_code, customs_duty, origin_code, start_date, end_date, measure_type, legal_base, measure_type_code, timestamp) values ($1, $2, $3, $4, $5, $6, $7, $8, $9), ($10, $11, $12, $13, $14, $15, $16, $17, $18), ($19, $20, $21, $22, $23, $24, $25, $26, $27) on conflict do nothing returning id', sinon.match.any).resolves({
            rows: [],
            rowCount: 1
        });

        stub2.withArgs("BEGIN").resolves();
        stub2.withArgs("COMMIT").resolves();
        stub2.withArgs("ROLLBACK").resolves();


    })
    afterEach(() => sinon.restore());

    describe("Query", () => {

        describe("Insert", () => {
            it('should return new row id', async function () {
                const {statusCode, rows: [first]} = await insertRow({tableName: 'em', data: {full_name: "me"}})
                assert.equal(statusCode, 200)
                assert.equal(first.id, 1)
            });
            it('should skip values with empty spaces and persist', async function () {
                const {statusCode, rows: [first]} = await insertRow({
                    tableName: 'temp_table',
                    data: {a: "abc", b: "xyz", c: '   '}
                })
                assert.equal(statusCode, 200)
                assert.equal(first.id, 1)
            });
            it('should return error if all are empty values', async function () {
                try {
                    const res = await insertRow({tableName: 'temp_table', data: {a: " ", b: " ", c: '   '}})
                } catch (e) {
                    assert.equal(e, 'MoleculerClientError: Cannot insert. Empty object')
                }
            });
        });

        describe("Insert VAT Rates", () => {
            let broker = new ServiceBroker({logger: false});
            const dummyService = broker.createService({name: "dummy", actions: {}});
            it('should return status', async function () {
                const {statusCode} = await addVatRateItems(
                    {
                        country: 'AT',
                        rate_type: 'REDUCED',
                        rate: 10,
                        items: [
                            ['58113', 'INFORMATION AND COMMUNICATION SERVICES / Publishing services / Publishing services of books, periodicals and other publishing services / Book publishing services / On-line books', 'Supply, including on loan by libraries, of books, newspapers and periodicals either on physical means of support or supplied electronically or both (including brochures, leaflets and similar printed matter, childrens picture, drawing or colouring books, music printed or in manuscript form, maps and hydrographic or similar charts), other than publications wholly or predominantly devoted to advertising and other than publications wholly or predominantly consisting of video content or audible music.', 'electronically supplied publications, temporary reduced rate 5% from 1th July to 31th December 2020']]
                    },
                    dummyService.logger);
                assert.equal(statusCode, StatusCodes.OK);
            });
        });

        describe("Get Country List", () => {
            it('should return status', async function () {
                const {statusCode} = await getCountryList();
                assert.equal(statusCode, StatusCodes.OK);
            });
        });

        describe("Get HS6P List", () => {
            it('should return status', async function () {
                const {rowCount} = await getHS6PList();
                assert.equal(rowCount, 8);
            });
        });

        describe("Clear VAT Rates", () => {
            let broker = new ServiceBroker({logger: false});
            const dummyService = broker.createService({name: "dummy", actions: {}});
            it('should not throw error', async function () {
                const statusCode = await clearVatRates(dummyService.logger);

                assert.equal(statusCode, StatusCodes.OK);
            });
        });

        describe('Format VAT Rate Items - 10 Items should return if success', () => {
            it('When VAT Rate list passes validations - 10 return', () => {
                const items = [{
                    "memberState": "SI",
                    "type": "STANDARD",
                    "rate": {"type": "DEFAULT", "value": 22},
                    "situationOn": null
                }, {
                    "memberState": "SI",
                    "type": "REDUCED",
                    "rate": {"type": "DEFAULT", "value": 9.5},
                    "situationOn": null,
                    "cnCodes": {
                        "code": [{
                            "value": "2936",
                            "description": "Provitamins and vitamins, natural or reproduced by synthesis (including natural concentrates), derivatives thereof used primarily as vitamins, and intermixtures of the foregoing, whether or not in any solvent"
                        }, {"value": "3001 20 90", "description": "Other"}, {
                            "value": "31",
                            "description": "CHAPTER 31 - FERTILISERS"
                        }, {
                            "value": "3101 00 00",
                            "description": "Animal or vegetable fertilisers, whether or not mixed together or chemically treated; fertilisers produced by the mixing or chemical treatment of animal or vegetable products"
                        }, {
                            "value": "3102",
                            "description": "Mineral or chemical fertilisers, nitrogenous"
                        }, {
                            "value": "3824 60",
                            "description": "Sorbitol other than that of subheading 290544"
                        }, {
                            "value": "3824 99 92",
                            "description": "In the form of a liquid at 20 °C"
                        }, {"value": "3824 99 93", "description": "Other"}, {
                            "value": "3824 99 96",
                            "description": "Other"
                        }]
                    },
                    "cpaCodes": {
                        "code": [{
                            "value": "56.1",
                            "description": "Restaurant and mobile food serving services"
                        }, {"value": "56.2", "description": "Event catering services and other food serving services"}]
                    },
                    "category": {
                        "identifier": "FOODSTUFFS",
                        "description": "Foodstuffs (including beverages but excluding alcoholic beverages) for human and animal consumption; live animals, seeds, plants and …"
                    },
                    "comment": "01207 99 96: Pumpkin seed; 1208 90 00: Ground poppy seed; 1212 99 95: Edible pits, seeds, kernels and other; 1302 19 70: Sap and plant extracts; 1214: Including common sainfoin; 2501 00 10: Salt; 2501 00 91: Salt; 2530 90 00: Sepiolite, also known as meerschaum; 2934 99 90: Acesulfame potassium; 2923 20 00: Lecithin; 2925 11 00: Saccharin and its salts; 3001 20 90: Royal jelly; 0407 11 00: Fertilized hatching eggs (Gallus domesticus)"
                }]
                const formatted_items = formatVatRateItems(items)
                assert.equal(formatted_items.length, 10);
            })

            it('When VAT Rate list miss memeber state object - 9 return', () => {
                const items = [{"type": "STANDARD", "rate": {"type": "DEFAULT", "value": 22}, "situationOn": null}, {
                    "memberState": "SI",
                    "type": "REDUCED",
                    "rate": {"type": "DEFAULT", "value": 9.5},
                    "situationOn": null,
                    "cnCodes": {
                        "code": [{
                            "value": "2936",
                            "description": "Provitamins and vitamins, natural or reproduced by synthesis (including natural concentrates), derivatives thereof used primarily as vitamins, and intermixtures of the foregoing, whether or not in any solvent"
                        }, {"value": "3001 20 90", "description": "Other"}, {
                            "value": "31",
                            "description": "CHAPTER 31 - FERTILISERS"
                        }, {
                            "value": "3101 00 00",
                            "description": "Animal or vegetable fertilisers, whether or not mixed together or chemically treated; fertilisers produced by the mixing or chemical treatment of animal or vegetable products"
                        }, {
                            "value": "3102",
                            "description": "Mineral or chemical fertilisers, nitrogenous"
                        }, {
                            "value": "3824 60",
                            "description": "Sorbitol other than that of subheading 290544"
                        }, {
                            "value": "3824 99 92",
                            "description": "In the form of a liquid at 20 °C"
                        }, {"value": "3824 99 93", "description": "Other"}, {
                            "value": "3824 99 96",
                            "description": "Other"
                        }]
                    },
                    "cpaCodes": {
                        "code": [{
                            "value": "56.1",
                            "description": "Restaurant and mobile food serving services"
                        }, {"value": "56.2", "description": "Event catering services and other food serving services"}]
                    },
                    "category": {
                        "identifier": "FOODSTUFFS",
                        "description": "Foodstuffs (including beverages but excluding alcoholic beverages) for human and animal consumption; live animals, seeds, plants and …"
                    },
                    "comment": "01207 99 96: Pumpkin seed; 1208 90 00: Ground poppy seed; 1212 99 95: Edible pits, seeds, kernels and other; 1302 19 70: Sap and plant extracts; 1214: Including common sainfoin; 2501 00 10: Salt; 2501 00 91: Salt; 2530 90 00: Sepiolite, also known as meerschaum; 2934 99 90: Acesulfame potassium; 2923 20 00: Lecithin; 2925 11 00: Saccharin and its salts; 3001 20 90: Royal jelly; 0407 11 00: Fertilized hatching eggs (Gallus domesticus)"
                }]
                const formatted_items = formatVatRateItems(items)
                assert.equal(formatted_items.length, 9);
            })

            it('When VAT Rate list miss rate type validations - 9 return', () => {
                const items = [{"memberState": "SI", "rate": {"type": "DEFAULT", "value": 22}, "situationOn": null}, {
                    "memberState": "SI",
                    "type": "REDUCED",
                    "rate": {"type": "DEFAULT", "value": 9.5},
                    "situationOn": null,
                    "cnCodes": {
                        "code": [{
                            "value": "2936",
                            "description": "Provitamins and vitamins, natural or reproduced by synthesis (including natural concentrates), derivatives thereof used primarily as vitamins, and intermixtures of the foregoing, whether or not in any solvent"
                        }, {"value": "3001 20 90", "description": "Other"}, {
                            "value": "31",
                            "description": "CHAPTER 31 - FERTILISERS"
                        }, {
                            "value": "3101 00 00",
                            "description": "Animal or vegetable fertilisers, whether or not mixed together or chemically treated; fertilisers produced by the mixing or chemical treatment of animal or vegetable products"
                        }, {
                            "value": "3102",
                            "description": "Mineral or chemical fertilisers, nitrogenous"
                        }, {
                            "value": "3824 60",
                            "description": "Sorbitol other than that of subheading 290544"
                        }, {
                            "value": "3824 99 92",
                            "description": "In the form of a liquid at 20 °C"
                        }, {"value": "3824 99 93", "description": "Other"}, {
                            "value": "3824 99 96",
                            "description": "Other"
                        }]
                    },
                    "cpaCodes": {
                        "code": [{
                            "value": "56.1",
                            "description": "Restaurant and mobile food serving services"
                        }, {"value": "56.2", "description": "Event catering services and other food serving services"}]
                    },
                    "category": {
                        "identifier": "FOODSTUFFS",
                        "description": "Foodstuffs (including beverages but excluding alcoholic beverages) for human and animal consumption; live animals, seeds, plants and …"
                    },
                    "comment": "01207 99 96: Pumpkin seed; 1208 90 00: Ground poppy seed; 1212 99 95: Edible pits, seeds, kernels and other; 1302 19 70: Sap and plant extracts; 1214: Including common sainfoin; 2501 00 10: Salt; 2501 00 91: Salt; 2530 90 00: Sepiolite, also known as meerschaum; 2934 99 90: Acesulfame potassium; 2923 20 00: Lecithin; 2925 11 00: Saccharin and its salts; 3001 20 90: Royal jelly; 0407 11 00: Fertilized hatching eggs (Gallus domesticus)"
                }]
                const formatted_items = formatVatRateItems(items)
                assert.equal(formatted_items.length, 9);
            })

            it('When VAT Rate list miss rate value validations - 9 return', () => {
                const items = [{"memberState": "SI", "rate": {"type": "DEFAULT"}, "situationOn": null}, {
                    "memberState": "SI",
                    "type": "REDUCED",
                    "rate": {"type": "DEFAULT", "value": 9.5},
                    "situationOn": null,
                    "cnCodes": {
                        "code": [{
                            "value": "2936",
                            "description": "Provitamins and vitamins, natural or reproduced by synthesis (including natural concentrates), derivatives thereof used primarily as vitamins, and intermixtures of the foregoing, whether or not in any solvent"
                        }, {"value": "3001 20 90", "description": "Other"}, {
                            "value": "31",
                            "description": "CHAPTER 31 - FERTILISERS"
                        }, {
                            "value": "3101 00 00",
                            "description": "Animal or vegetable fertilisers, whether or not mixed together or chemically treated; fertilisers produced by the mixing or chemical treatment of animal or vegetable products"
                        }, {
                            "value": "3102",
                            "description": "Mineral or chemical fertilisers, nitrogenous"
                        }, {
                            "value": "3824 60",
                            "description": "Sorbitol other than that of subheading 290544"
                        }, {
                            "value": "3824 99 92",
                            "description": "In the form of a liquid at 20 °C"
                        }, {"value": "3824 99 93", "description": "Other"}, {
                            "value": "3824 99 96",
                            "description": "Other"
                        }]
                    },
                    "cpaCodes": {
                        "code": [{
                            "value": "56.1",
                            "description": "Restaurant and mobile food serving services"
                        }, {"value": "56.2", "description": "Event catering services and other food serving services"}]
                    },
                    "category": {
                        "identifier": "FOODSTUFFS",
                        "description": "Foodstuffs (including beverages but excluding alcoholic beverages) for human and animal consumption; live animals, seeds, plants and …"
                    },
                    "comment": "01207 99 96: Pumpkin seed; 1208 90 00: Ground poppy seed; 1212 99 95: Edible pits, seeds, kernels and other; 1302 19 70: Sap and plant extracts; 1214: Including common sainfoin; 2501 00 10: Salt; 2501 00 91: Salt; 2530 90 00: Sepiolite, also known as meerschaum; 2934 99 90: Acesulfame potassium; 2923 20 00: Lecithin; 2925 11 00: Saccharin and its salts; 3001 20 90: Royal jelly; 0407 11 00: Fertilized hatching eggs (Gallus domesticus)"
                }]
                const formatted_items = formatVatRateItems(items)
                assert.equal(formatted_items.length, 9);
            })
        });

    });

    describe('File upload service actions', ()=> {

        let broker = new ServiceBroker({logger: false});

        let service = broker.createService({...schema, name: 'file_upload'});
        before(() => broker.start());
        after(() => broker.stop());

        describe("Upload File containing multiple sheets", () => {
            it('should return request status as error', async function () {
                const buffer = Buffer.from(
                    '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',
                    'base64'
                );

                const readStream = new Readable({
                    read() {
                        this.push(buffer);
                        this.push(null);
                    },
                });
                const {status, errorMsg} = await broker.call('file_upload.uploadFile', readStream, {
                    meta: {
                        fieldname: "file",
                        filename: "test-vat rates.xlsx",
                        $multipart: {data_type: 'country_vat_rate'},
                        encoding: "7bit",
                        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    }
                });

                assert.equal(status, 'error');
                assert.equal(errorMsg, 'File Upload failed as it contains multiple sheets');
            });
        });

        describe("Upload File", () => {
            it('should return request status as success', async function () {
                const buffer = Buffer.from('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', 'base64');

                const readStream = new Readable({
                    read() {
                        this.push(buffer);
                        this.push(null);
                    },
                });
                const {status} = await broker.call('file_upload.uploadFile', readStream, {
                    meta: {
                        fieldname: "file",
                        filename: "test-vat rates.xlsx",
                        $multipart: {data_type: 'country_vat_rate'},
                        encoding: "7bit",
                        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    }
                });

                assert.equal(status, 'success');
            });
        });

        describe("Upload Customs Duty files", () => {
            it('should return request status as success', async function () {
                const buffer = Buffer.from(
                    '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',
                    'base64');

                const readStream = new Readable({
                    read() {
                        this.push(buffer);
                        this.push(null);
                    },
                });
                const {status} = await broker.call('persistence.uploadFile', readStream, {
                    meta: {
                        fieldname: "file",
                        filename: "test.zip",
                        $multipart: {data_type: 'custom_duty_rate'},
                        encoding: "zip",
                        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    }
                });

                assert.equal(status, 'success');
            });
        });

        describe("Cancel file upload job", () => {
            it('should return row count', async function () {
                const {rowCount} = await broker.call('file_upload.cancel_file_upload_job', {id: 3});
                assert.equal(rowCount, 1)
            });
        });
    });

});
