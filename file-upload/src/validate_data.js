const moment = require('moment');

async function validateData (data, schema) {

	const rows = [];
	const errors = [];
	validateSchema(schema);

	const columns = schema.columns;

	for (let i = 0; i < data.length; i++) {
		const row = data[i];
		const rowItem = {};
		let errorsPerRow = 0;

		for (const column of columns) {
			const schemaEntry = schema[column];
			const columnValue = row[column];
			let value;
			let error;

			if (columnValue === undefined) {
				value = null;
			} else {
				const result = parseValue(columnValue, schemaEntry);
				if (result.error) {
					error = result.error;
					errorsPerRow += 1;
					value = columnValue;
				} else {
					value = result.value;
				}
			}

			if (!error && value === null && schemaEntry.required) {
				error = 'required'
			}

			if (error) {
				errorsPerRow += 1;
				const errorItem = {
					error,
					row: i + 2,
					column,
					value
				};
				errors.push(errorItem);
			} else {
				if (value != null) {
					rowItem[schemaEntry.prop] = value;
				}
			}
		}

		if (errorsPerRow === 0) {
			rows.push(rowItem);
		}
	}

	if (rows.length === 0) {
		throw new Error(`File contains invalid data.`)
	}

	return { rows, errors }
}

function parseValue(value, schemaEntry) {
	let result;
	if (schemaEntry.type) {
		result = parseValueOfType(value, schemaEntry.type);
	} else {
		result = { value: value};
	}

	// If errored then return the error
	if (result.error) {
		return result
	}

	if (result.value !== null) {
		if (schemaEntry.oneOf && schemaEntry.oneOf.indexOf(result.value) < 0) {
			return { error: 'invalid' }
		}
	}

	return result;
}

function parseValueOfType(value, type) {
	switch (type) {
		case String:
			return { value };

		case Number:
			if (!isFinite(value)) {
				return { error: 'invalid' }
			}
			return { value };

		case Boolean:
			if (typeof value === 'boolean') {
				return { value }
			}
			return { error: 'invalid' };

		case Date:
			// default: 'MM/DD/YYYY'
			const date = moment(value, 'MM/DD/YYYY');
			if (!date.isValid()) {
				return { error: 'invalid' }
			}
			return { value };

		default:
			if (typeof type === 'function') {
				return parseCustomValue(value, type)
			}
			throw new Error(`Unknown schema type: ${type && type.name || type}`)
	}

}

function parseCustomValue(value, parse) {
	try {
		value = parse(value);
		if (value === undefined) {
			return { value: null }
		}
		return { value }
	} catch (error) {
		return { error: error.message }
	}
}

function validateSchema(schema) {
	const columns = schema.columns;
	if (columns && columns.length > 0) {
		for (const column of columns) {
			const entry = schema[column];
			if (!entry) {
				throw new Error(`Schema entry not defined for column "${column}".`)
			} else {
				if (!entry.prop) {
					throw new Error(`"prop" not defined for schema entry "${column}".`)
				}
			}
		}
	} else {
		throw new Error(`Columns not defined for schema.`)
	}
}


module.exports = {
	validateData,
	validateSchema,
	parseValueOfType,
	parseValue
};
