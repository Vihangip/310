import {ResultTooLargeError} from "./IInsightFacade";

export default class PerformQuery{
	private maxNoOfResults: number  = 5000;

	constructor() {
		console.log("performing query...");
	}

	public performQuery(query: any, dataset: any[]): any {
		let body = query["WHERE"];
		let options = query["OPTIONS"];
		let processedData: any[];

		if(body === undefined) {
			processedData = dataset;
		} else {
			processedData = this.processFilter(body,dataset);
		}

		if(processedData.length > this.maxNoOfResults) {
			return Promise.reject(new ResultTooLargeError("Results are more than 5000"));
		}

		let columns: any = this.processCols(options,processedData);
		return this.outputResults(options,columns);


	}

	public processFilter(whereStatement: any, dataset: any[]): any[] {
		if ("AND" in whereStatement) {
			return this.processAND(whereStatement["AND"],dataset);
		}
		if ("OR" in whereStatement) {
			return this.processOR(whereStatement["OR"],dataset);
		}
		if ("LT" in whereStatement) {
			return this.processMComp(whereStatement["LT"],dataset,"LT");
		}
		if ("GT" in whereStatement) {
			return this.processMComp(whereStatement["GT"],dataset,"GT");
		}
		if ("EQ" in whereStatement) {
			return this.processMComp(whereStatement["EQ"],dataset,"EQ");
		}
		if ("IS" in whereStatement) {
			return this.processSComp(whereStatement["IS"],dataset);
		}
		if ("NOT" in whereStatement) {
			return this.processNOT(whereStatement,dataset);
		}
		return [];

	}

	public processAND(andStatement: any, dataset: any[]): any[] {
		// let results: any[] = [];
		// let temp: any[];
		// andStatement.forEach((filter: any, index: number) => {
		// 	temp = this.processFilter(filter,dataset);
		// 	if(index === 0){
		// 		results = temp;
		// 	} else {
		// 		results = results.filter((data) => temp.includes(data));
		// 	}
		// });
		// return results;

		let outputList: any[] =  [];
		let andList: any[] = [];
		let frequency: any[] = [];

		for(let i = 0; i < Object.values(andStatement).length; i++) {
			andList.push(this.processFilter(andStatement[i], dataset));
		}

		for(let element of andList) {
			for(let subElement of element){
				if(frequency[subElement["id"]]) {
					frequency[subElement["id"]]++;
				}

				frequency[subElement["id"]] = 1;

				if(frequency[subElement["id"]] === andList.length) {
					outputList.push(subElement);
				}
			}
		}

		return outputList;
	}

	public processOR(orStatement: any, dataset: any[]): any[] {
		// let results: any[] = [];
		// let temp: any[];
		// orStatement.forEach((filter: any) => {
		// 	temp = this.processFilter(filter,dataset);
		// 	results = [...new Set([...results,...temp])];
		// });
		// return results;
		let outputList: any[] =  [];
		let orList: any[] = [];
		let frequency: any[] = [];

		for(let i = 0; i < Object.values(orStatement).length; i++) {
			orList.push(this.processFilter(orStatement[i], dataset));
		}

		for(let element of orList) {
			for(let subElement of element){
				if(!(frequency[subElement["id"]])) {
					outputList.push(subElement);
				}

				frequency[subElement["id"]] = 1;
			}
		}

		return outputList;


	}

	public processMComp(mStatement: any, dataset: any, comp: string): any[] {
		// let mField: string = this.getKeyField(mStatement);
		let outputList: any[] = [];

		for(let index of Object.values(dataset) as any) {
			let course: any = Object.values(index)[0];
			for(let section of course){
				let key = Object.keys(mStatement)[0]; // file?
				let sectionValue = section[key];
				let value: any = Object.values(mStatement)[0];

				if(comp === "LT") {
					if(sectionValue < value) {
						outputList.push(section);
					}
				} else if (comp === "GT") {
					if(sectionValue > value) {
						outputList.push(section);
					}
				} else if (comp === "EQ") {
					if (sectionValue === value) {
						outputList.push(section);
					}
				}
			}
		}
		return outputList;

	}

	public processSComp(sStatement: any, dataset: any): any[] {
		let outputList: any[] = [];

		for(let index of Object.values(dataset) as any) {
			let course: any = Object.values(index)[0];
			for (let section of course) {
				let key = Object.keys(sStatement)[0]; // check here
				let sectionValue = section[key];

				if(sectionValue.type !== "string") {
					sectionValue = sectionValue.toString();
				}

				let match: string = Object.values(sStatement)[0] as string;
				let input: string = "";

				if(match.startsWith("*") && match.endsWith("*") && match.length >= 2) {
					input = match.substring(1, match.length - 1);
					if(sectionValue.includes(input)) {
						outputList.push(section);
					}
				} else if(match.startsWith("*")) {
					input = match.substring(0, match.length - 1);
					if(sectionValue.startsWith(input)) {
						outputList.push(section);
					}
				} else if (match.endsWith("*")) {
					input = match.substring(1, match.length);
					if(sectionValue.endsWith(input)) {
						outputList.push(section);
					}
				} else if (sectionValue === match) {
					outputList.push(section);
				}
			}
		}
		return outputList;
	}

	public processNOT(notStatement: any, dataset: any): any[] {
		let outputList: any[];
		let sections: any[] = [];
		let resultSections: any[] = this.processFilter(notStatement,dataset);

		for(let index of Object.values(dataset) as any) {
			let course: any = Object.values(index)[0];
			for (let section of course) {
				sections.push(section);
			}
		}
		// sections = sections.filter(function (i) {
		// 	outputList = resultSections.includes(i);
		// });
		outputList = sections.filter((data) => !resultSections.includes(data));

		return outputList;
	}


	private processCols(options: any, processedData: any[]): any[] {
		let columns = options["COLUMNS"];
		 for(let section of processedData) {
			 let secCols: string[] = Object.keys(section);

			 for(let col of secCols) {
				 if(!columns.includes(col)) {
					 delete section[col];
				 }
			 }
		 }
		 return processedData;
	}

	// the logic for the sorting part of the following method was taken from this stackoverflow answer https://stackoverflow.com/a/21689268
	private outputResults(options: any, columns: any) {
		let ouputResults: any;
		let order = options["ORDER"];

		if (order === undefined) {
			return columns;
		}

		ouputResults = columns.sort((first: any,second: any) => {
			if(first[order] > second[order]) {
				return 1;
			}

			if(first[order] < second[order]) {
				return -1;
			}

			return 0;
		});

		return ouputResults;


	}
}
