const { createVatRateList, createSchemaVatRates }  = require("./schemas/country_vat_rate");
const { createSchemaHS6P, createHs6pList} = require("./schemas/hs6p");
const { getSchemaCustomDutyRate, createErrorList, processCustomDutyRates } = require('./schemas/custom_duty_rates/custom_duty_rate');
const { addVatRateItems, clearVatRates, insertHSP6Data} = require("./query");
const { validateData } = require('./validate_data');
const { StatusCodes } = require('http-status-codes');
const  unzipper = require('unzipper');
const XLSX = require('xlsx');

async function processFile(ctx, data_type, logger) {
	const { params } = ctx;
	const { filename } = ctx.meta;

	try {
		const data =  await readFile(params, logger);
		const fileRowCount = data.length;
		const schema = await getSchema(data_type);

		try {
			const {rows: rowList, errors: errorList } = await validateData(data, schema);

			if (fileRowCount > 0) {
				const noOfRows = rowList.length;
				const noOfErrorRows = fileRowCount - noOfRows;
				logger.info(`No. of rows in excel ${fileRowCount}`);
				const excludeRowCount = await saveData(rowList, data_type, logger);
				logger.info(`No. of rows : ${noOfRows} and no. of error rows : ${noOfErrorRows}`);

				return {
					filename: filename,
					noOfRows: fileRowCount,
					noOfRowsUploaded: noOfRows - excludeRowCount,
					excludeRowCount: excludeRowCount,
					errorList: errorList,
					status: 'success'
				};
			} else {
				return {
					filename: filename,
					status: 'error',
					errorMsg: 'File Upload failed.'
				};
			}
		} catch (error) {
			logger.error(`Error in data validation / schema of ${filename} - `, error);
			return {
				filename: filename,
				status: 'error',
				errorMsg: `File upload failed. ${error.message}`
			};
		}

	} catch (error) {
		logger.error(`Error in reading file ${filename} - `, error);
		return {
			filename: filename,
			status: 'error',
			errorMsg: error
		};
	}
}

async function processFiles(ctx, data_type, logger) {
	const { params } = ctx;
	const promiseFiles = [];

	const zip = params.pipe(unzipper.Parse({forceStream: true}));
	for await (const entry of zip) {
		promiseFiles.push(
			await new Promise( async (resolve, reject) => {
				try {
					const fileRead = await readFile(entry, logger);
					resolve(fileRead);
				} catch (e) {
					reject( e + ' - '+ entry.path)
				}
			})
		)
	}

	await Promise.all(promiseFiles);
	logger.info('unzipped', promiseFiles.length);

	const schemas = await getSchema(data_type);

	try {
		const {rows: rowList1, errors: errorList1 } = await validateData(promiseFiles[0], schemas[0]);
		const {rows: rowList2} = await validateData(promiseFiles[1], schemas[1]);
		const {rows: rowList3} = await validateData(promiseFiles[2], schemas[2]);
		logger.info('validation done', rowList1.length, rowList2.length, rowList3.length);

		if (rowList1.length > 0) {
			const job_id = await processCustomDutyRates(rowList1, rowList2, rowList3, logger);


			const errorList = await createErrorList(errorList1);

			return {
				filename: 'Custom Duty Rate',
				errorList: errorList,
				jobId: job_id,
				status: 'success'
			}
		} else {
			return {
				filename: 'Custom duty rate',
				status: 'error',
				errorMsg: 'File Upload failed.'
			};
		}

	} catch (error) {
		logger.error(`Error in data validation / schema of ${data_type} - `, error);
		return {
			filename: 'Customs Duty',
			status: 'error',
			errorMsg: `File upload failed. ${error.message}`
		};
	}
}

async function readFile(stream, logger) {
	let buffers = [];
	let result = [];

	stream.on('data', function(data) { buffers.push(data); });
	return new Promise((resolve, reject) => {
		stream.on('end', function() {
			let buffer = Buffer.concat(buffers);
			let workbook = XLSX.read(buffer, {type: "buffer", cellDates: true});

			if (workbook.SheetNames.length > 1) {
				reject('File Upload failed as it contains multiple sheets');
			} else {
				let sheetName = workbook.SheetNames[0];
				let worksheet = workbook.Sheets[sheetName];
				result = XLSX.utils.sheet_to_json(worksheet);
				logger.info('result', result.length);
				resolve(result);
			}

		});
	});
}

async function saveData(validatedData, ref_data_type, logger) {
	switch (ref_data_type) {
		case "country_vat_rate": {
			const { excludeRowCount, vatRateItems} = await createVatRateList(validatedData);
			const status = await clearVatRates(logger);
			if (status === StatusCodes.OK) {
				for (const item of vatRateItems) {
					await addVatRateItems(item, logger);
				}
			}
			return excludeRowCount;
		}
		case "hs6p":{
			const { excludeRowCount, hs6pItems } = await createHs6pList(validatedData);
			await insertHSP6Data(hs6pItems);
			return excludeRowCount;
		}
	}
}

async function getSchema(ref_data_type) {
	switch (ref_data_type) {
		case "country_vat_rate": {
			return await createSchemaVatRates();
		}
		case "hs6p":{
			return await createSchemaHS6P();
		}
		case "custom_duty_rate": {
			return await getSchemaCustomDutyRate();
		}
	}
}

module.exports = {
	processFile,
	processFiles,
	saveData,
	getSchema,
	readFile
};
