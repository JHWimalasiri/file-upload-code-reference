/*global module*/

const { default: db ,v2 } = require('@q4us-sw/q4us-db');
const { isNull } = require('@q4us-sw/q4us-db/lib/v2/postgres');
const { postgres } = db;
const { StatusCodes } = require('http-status-codes');
const {VATRateType} = require('./constants')
const { MoleculerClientError, MoleculerError } = require("moleculer").Errors;
const {mapCountryCode} = require('./util');

async function insertRow({ tableName, data: _data, emptyStringAllowed = false }) {
	let data = _data
	if(!emptyStringAllowed){
		data = Object.entries(data).reduce((acc,[k,v])=>{
			if(v != null && !(/^ *$/.test(`${v}`))){
				return {...acc, [k]: v}
			}
			return acc;
		},{})
	}

	if(Object.keys(data).length === 0){
		return Promise.reject(new MoleculerClientError("Cannot insert. Empty object"));
	}

	const query = new postgres.Query().insert(tableName, data).returning(["id"])
	return await postgres.execute(query)
}

async function getCountryList() {
	const query = new postgres.Query(`select iso_alpha_2 from country`);
	return await postgres.execute(query)
}

async function addVatRateItems(item, logger, source = 'UPLOAD' ) {
	const {country, rate_type, rate, items} = item
	const query = new postgres.Query("select insert_vat_rate_data($1, $2, $3, $4, $5)");
	query.values = [mapCountryCode(country), rate_type, rate, source, items];
	const {statusCode, message } = await postgres.execute(query);

	return {statusCode: statusCode};
}

async function clearVatRates(logger) {

	const deleteCountryVatItemQuery = new postgres.Query(`delete from country_vat_item using country_vat_rate where country_vat_rate.is_data_reserved = false and country_vat_item.country_vat_rate_id = country_vat_rate.id`);
	const {statusCode: statusCode1, message: message1} = await postgres.execute(deleteCountryVatItemQuery);

	if (statusCode1 === StatusCodes.OK) {
		const deleteCountryVatRateQuery =  new postgres.Query().delete("country_vat_rate").where([{key: "is_data_reserved", value: false}]);
		const {statusCode: statusCode2, message: message2} = await postgres.execute(deleteCountryVatRateQuery);
		if (statusCode2 !== StatusCodes.OK) {
			logger.error("Failed to clear vat rate item data", message2);
		}
		return statusCode2;

	} else {
		logger.error("Failed to clear vat rate data", message1);
		return statusCode1;
	}
}

function formatVatRateItems(vat_rate_items){

	let vat_rate_items_formatted = []

	vat_rate_items.forEach((item, index) => {
		const {memberState = null, type : item_type, rate = {}, category = {} } = item
		const {identifier = null} = category
		const {value : vat_value = -1} = rate
		if(!memberState){
			return
		}
		if(!(item_type === VATRateType.STANDARD || item_type === VATRateType.REDUCED)){
			return
		}
		if(vat_value < 0){
			return
		}
		if (item.rate.type === 'DEFAULT') {
			const vat_entry = {}

			vat_entry['country'] = memberState
			vat_entry['rate_type'] = item_type
			vat_entry['rate'] = vat_value
			vat_entry['category'] = identifier

			if (item.hasOwnProperty('cnCodes')) {
				if (item['cnCodes']['code'].length > 0) {
					item.cnCodes.code.forEach((e, i) => {
						let hs6p_code = e.value.replace(/\D/g, '')
						vat_entry['hs6p_code'] = hs6p_code;
						vat_entry['comments'] = (e.description || {}) || null
						vat_rate_items_formatted.push(vat_entry)
					})
				}
			}

			else if (item.hasOwnProperty('cpaCodes')) {
				if (item['cpaCodes']['code'].length > 0) {
					item.cpaCodes.code.forEach((e, i) => {
						vat_entry['cpa_code'] = e.value.replace(/\D/g, '');
						vat_entry['comments'] = (e.description || {}) || null
						vat_rate_items_formatted.push(vat_entry)
					})
				}
			}

			else{
				vat_rate_items_formatted.push(vat_entry)
			}

		}
	});

	return vat_rate_items_formatted
}

async function persistCountryVATRates(converted_results_json, logger = this.logger){
	const { createVatRateList }  = require("./ref_data_upload/schemas/country_vat_rate");

	const formatted_vat_rate_items = await formatVatRateItems(converted_results_json);

	const { excludeRowCount, vatRateItems} = await createVatRateList(formatted_vat_rate_items);


	const status = await clearVatRates(logger);

	if (status === StatusCodes.OK) {
		for (const item of vatRateItems) {
			const {statusCode} = await addVatRateItems(item, logger, 'WEB_SERVICE');
			if(statusCode !== StatusCodes.OK){
				logger.error('Error persisting item: ', JSON.stringify(item))
			}
		}
	}
	else{
		logger.error('Error clearing VAT Rates with status code: ', status)
	}
	return {excludeRowCount};
}

async function insertHSP6Data(data) {
	const insertQuery = new v2.postgres.Query().insert("hs6p_code", data, true).returning(['id']);
	return await v2.postgres.execute(insertQuery);
}

async function insertMeasureType(data) {
	const insertQuery = new v2.postgres.Query().insert("measure_type", data, true).returning(['id']);
	return await v2.postgres.execute(insertQuery);
}

async function getHS6PList() {
	const query = new v2.postgres.Query().select("hs6p_code",["hs6p_code"]);
	return await v2.postgres.execute(query);
}

async function deleteFileUploadJob(id) {
	const deleteCustomDutyRatePendingJob =  new postgres.Query().delete("file_upload_job").where([{key:"id",value:id},{key:"type",value:'custom_duty_rate'}, {key:"status",value:'pending'}]);
	return await postgres.execute(deleteCustomDutyRatePendingJob);

}

module.exports = {
	insertRow,
	getCountryList,
	addVatRateItems,
	clearVatRates,
	formatVatRateItems,
	insertHSP6Data,
	insertMeasureType,
	getHS6PList,
	deleteFileUploadJob
}
