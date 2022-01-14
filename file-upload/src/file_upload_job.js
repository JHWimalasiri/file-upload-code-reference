const { insertRow, updateById } = require("./query");
const moment = require('moment');
const {yyyyUtil} = require("@yyyy-sw/yyyy-util");

async function createJob(type) {
	const job = {
		type: type,
		status: 'pending',
		progress: 0,
		response: {
			filename: 'Custom Duty Rate',
			noOfRows: 0,
			skippedRows: 0,
			noOfRowsUploaded: 0,
			excludeRowCount: 0
		}
	};
	const { rows: [{id}]} = await insertRow({tableName:'file_upload_job', data:job});
	return id;
}

async function updateJob(jobId, progress, rows, uploadedRows, excludedRows) {
	const response = {
		filename: 'Custom Duty Rate',
		noOfRows: rows,
		skippedRows: rows - uploadedRows,
		noOfRowsUploaded: uploadedRows,
		excludeRowCount: excludedRows
	};
	return  await updateById({tableName: 'file_upload_job',
		data: { id: jobId, progress: yyyyUtil.roundToDecimal(progress, 2), response: response, last_updated: moment()}
	});
}

module.exports = {
	createJob,
	updateJob
};
