const {createSchemaDutiesImport} = require('./duties_import');
const { createSchemaAreasRegions } = require('./areas_n_regions');
const { createSchemaCountryExclusions } = require('./country_exclusions');
const { insertMeasureType, getCountryList } = require("./../../query");
const { createJob, updateJob } = require("../../file_upload_job");
const moment = require('moment');
const { v2 } = require('@yyyy-sw/yyyy-db');
const { postgres } = v2;
const Transaction = postgres.Transaction;


async function getSchemaCustomDutyRate() {
    const schemas = [];

    schemas.push(await createSchemaDutiesImport());
    schemas.push(await createSchemaAreasRegions());
    schemas.push(await createSchemaCountryExclusions());
    return schemas;
}

async function processCustomDutyRates(dutyList, countryGroupList, exclusionList, logger) {

    const excludedCountryMap = new Map();
    const measureTypeMap = new Map();
    const countryGroupMap = new Map();

    // Create exclusion country Map
    for (const excludedCountryEntry of exclusionList) {
        const { hs6p_code, excluded_country, measure_type, measure_type_code} = excludedCountryEntry;

        //Get excluded country list
        if (excludedCountryMap.has(hs6p_code)) {
            const matchingMapEntry = excludedCountryMap.get(hs6p_code);
            matchingMapEntry.push(excluded_country);
            excludedCountryMap.set(hs6p_code, matchingMapEntry);
        } else {
            excludedCountryMap.set(hs6p_code, [excluded_country]);
        }

        // Get Measure type details
        if (!measureTypeMap.has(measure_type_code)) {
            measureTypeMap.set(measure_type_code, {measure_type_code, measure_type});
        }
    }
    // Create country group map
    for (const countryGroupEntry of countryGroupList) {
        const { country_group_code, country_code} = countryGroupEntry;

        if (countryGroupMap.has(country_group_code)) {
            const matchingArray = countryGroupMap.get(country_group_code);
            matchingArray.push(country_code);
            countryGroupMap.set(country_group_code, matchingArray);
        } else {
            countryGroupMap.set(country_group_code, [country_code]);
        }
    }

    insertMeasureType(measureTypeMap);

    const job_id = await createJob('custom_duty_rate');
    saveCustomDutyRateData(job_id, dutyList, countryGroupMap, excludedCountryMap, logger).catch(error => {
        logger.error(error);
    });

    return job_id

}

async function saveCustomDutyRateData(jobId, dutyRates, countryGroupMap, excludedCountryMap, logger) {

    //Get country list for validation
    const {rows} = await getCountryList();
    const countries = (rows || []).map(({iso_alpha_2})=>iso_alpha_2);

    let totalExcludedCount = 0;
    let totalRows = 0;
    let totalUploadedRows = 0;
    let count = 0;
    let ratio = 0;
    const txn = new Transaction();
    const deleteQuery = new postgres.RawQuery(`delete from country_customs_duty_rate`, []);

    try {
        await txn.begin();
        await txn.execute('Clear all custom duty rates', deleteQuery);
        for (let i = 0; i < dutyRates.length; i++) {
            const {excludeRowCount, customDutyRateItems} = await processAllData(dutyRates[i], countryGroupMap, excludedCountryMap, countries, logger);
            totalExcludedCount += excludeRowCount;
            if (customDutyRateItems.length > 0) {
                totalRows += customDutyRateItems.length;
                const insertQuery = new postgres.Query().insert("country_customs_duty_rate", customDutyRateItems, true).returning(['id']);
                const { rowCount = 0 } = await txn.execute('customs_duty_rates', insertQuery);
                totalUploadedRows += rowCount || 0;

                // update job with progress
                ratio = i * 100 / dutyRates.length;
                if ((ratio >= count * 5) ||
                    (i === (dutyRates.length - 1))) {
                    const { rowCount } = await updateJob(jobId, ratio, totalRows, totalUploadedRows, totalExcludedCount);
                    count++;
                    if (rowCount === 0) {
                        await txn.rollback();
                        return Promise.reject('File upload job got cancelled');
                    }
                }
            }
        }

        await txn.end();
        await txn.response();
        return await updateJob(jobId, 100, totalRows, totalUploadedRows, totalExcludedCount);

    } catch (error) {
        await txn.rollback();
        logger.error("transaction failed", error);
        return Promise.reject(error);
    }
}

async function processAllData(dutyEntry, countryGroupMap, excludedCountryMap, countries, logger) {

    let excludedCount = 0;
    const customDutyMap = new Map();

    const {hs6p_code, origin_code, start_date, end_date, measure_type, legal_base, customs_duty, measure_type_code} = dutyEntry;
    const excludedCountryList = (excludedCountryMap.has(hs6p_code) ? excludedCountryMap.get(hs6p_code) : []);

    if (/\d/.test(origin_code)) { // origin is a country group

        const countryList = (countryGroupMap.has(origin_code) ? countryGroupMap.get(origin_code) : []);
        let filteredCountryArray;

        if (countryList.length > 0 && excludedCountryList.length > 0) {
            filteredCountryArray = getApplicableCountryList(countryList, excludedCountryList);
        } else {
            filteredCountryArray = countryList;
        }

        for (const entry of filteredCountryArray) {
            const key = hs6p_code + entry;
            if (!customDutyMap.has(key)) {
                const customDuty = {
                    hs6p_code,
                    customs_duty,
                    origin_code: entry,
                    start_date,
                    end_date,
                    measure_type,
                    legal_base,
                    measure_type_code,
                    timestamp: moment()
                };
                customDutyMap.set(key, customDuty);
            }
        }
        excludedCount += (countryList.length - filteredCountryArray.length);
    } else {
        if (!(excludedCountryList.includes(origin_code)) && countries.includes(origin_code)) {
            const key = hs6p_code + origin_code;
            if (!customDutyMap.has(key)) {
                const customDuty = {
                    hs6p_code,
                    customs_duty,
                    origin_code,
                    start_date,
                    end_date,
                    measure_type,
                    legal_base,
                    measure_type_code,
                    timestamp: moment()
                };
                customDutyMap.set(key, customDuty);
            }
        } else {
            excludedCount += 1;
        }
    }

    return {
        excludeRowCount: excludedCount,
        customDutyRateItems: Array.from(customDutyMap.values())
    };
}

function getApplicableCountryList(countryList, excludedList) {
    const result = [];
    const set = new Set(excludedList);
    for (let i = 0, length = countryList.length; i < length; ++i) {
        if (!set.has(countryList[i])) result.push(countryList[i]);
    }
    return result;
}

async function createErrorList(errorList) {
    const errorMap = new Map();

    for (const errorItem of errorList) {
        const {error, column } = errorItem;
        const key = error + column;

        if (errorMap.has(key)) {
            const matchedEntry = errorMap.get(key);
            matchedEntry.occurrence += 1;
            errorMap.set(key, matchedEntry);
        } else {
            errorMap.set(key, {error, column, occurrence: 1});
        }
    }
    return Array.from(errorMap.values())
}

module.exports = {
    getSchemaCustomDutyRate,
    processAllData,
    createErrorList,
    getApplicableCountryList,
    processCustomDutyRates,
    saveCustomDutyRateData
};
