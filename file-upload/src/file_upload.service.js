/*global require*/
/*global module*/
/*global process*/
const { StatusCodes } = require('http-status-codes');
const { MoleculerClientError } = require("moleculer").Errors;
const {performance} = require('perf_hooks');
const Files = require('./plugins/files')
const {publishServiceResponseTime} = require('./statistics');


module.exports = {
	name: process.env.npm_package_name,
	mixins:[Files],
	hooks: {
		before: {
			async "*"(ctx) {
				const { id, nodeID, action: { name: action_name }, service: { name: service_name }, caller, level, requestID, parentID } = ctx;
				ctx.meta.eas_persistence_response_time = performance.now();
				ctx.meta.persistence_node_id = this.broker.nodeID;
				ctx.call("audit.start", { id, nodeID, action_name, service_name, caller, level, requestID, parentID })
			}
		},
		after: {
			async "*"(ctx, res) {
				const { id, nodeID, action: { name: action_name }, service: { name: service_name }, caller, level, requestID, parentID } = ctx;
				ctx.call("audit.complete", { id, nodeID, action_name, service_name, caller, level, requestID, parentID })
				publishServiceResponseTime(ctx);
				return res;
			}
		}
	},
	actions: {

		uploadFile:{
			async handler(ctx) {
				const { $multipart: {data_type} } = ctx.meta;
				if (data_type === 'custom_duty_rate') {
					return await this.processFiles(ctx, data_type, this.logger);
				} else {
					return await this.processFile(ctx, data_type, this.logger);
				}
			}
		},

		cancel_file_upload_job: {
			params: {
				id: "number"
			},
			async handler(ctx) {
				const {params: {id}} = ctx;
				return await this.deleteFileUploadJob(id);
			}
		}
	},
	created() {
		const { deleteFileUploadJob} = require("./query");
		const  { processFile, processFiles }  = require("./upload_data");
		this.processFile = processFile.bind(this);
		this.processFiles = processFiles.bind(this);
		this.deleteFileUploadJob = deleteFileUploadJob.bind(this);
	}
};

