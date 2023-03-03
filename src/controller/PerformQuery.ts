import {InsightResult, ResultTooLargeError} from "./IInsightFacade";
export default class PerformQuery{
	private maxNoOfResults: number  = 5000;
	constructor() {
		console.log("performing query...");
	}

	public performQuery(query: any, dataset: any): Promise<InsightResult[]> {
		let body = query["WHERE"];

		let options = query["OPTIONS"];

		let processedData: any[];

		if(Object.keys(body).length === 0) { // No WHERE part so results are unfiltered which might result in TooLarge Error
			processedData = dataset.sections;
		} else {
			processedData = this.processFilter(body,dataset); // else processing WHERE clause
		}
		if(processedData.length > this.maxNoOfResults) { // checking if too many results
			console.log("too large");
			return Promise.reject(new ResultTooLargeError("Results are more than 5000"));
		}

		let columns: any = this.processCols(options,processedData);
		let output: any[] = this.outputResults(options,columns);
		return Promise.resolve(output);
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


	public processAND(andStatement: any, dataset: any[]): any[] { // this is not working as intended

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


	public processOR(orStatement: any, dataset: any[]): any[] { // this is not working as intended

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
		let outputList: any[] = [];
		let sectionList: any = Object.values(dataset)[3];
		let courses: any[] = this.convertToCourses(sectionList);
		for(let course of courses) { // iterating through courses
			for(let section of course) { // iterating through sections
				let wholeKey = Object.keys(mStatement)[0];
				let words: string[] = wholeKey.split("_");
				let field: string = words[1];
				const sectionFields: any = {
					avg: section.avg,
					pass: section.pass,
					fail: section.fail,
					audit: section.audit,
					year: section.year
				};
				let sectionValue = sectionFields[field]; // grabbing actual value
				let value: any = Object.values(mStatement)[0]; // grabbing query value
				if(comp === "LT") { // checking the comparisons
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

	public convertToCourses(sectionList: any[]): any[] { // converts section list to courses by separating them by course id
		let courseList: any = [];
		let course: any = [];
		let currCourseId: string = "";
		for(let currSection of sectionList){
			if(currCourseId === "" || currCourseId === currSection.id) { // same section
				currCourseId = currSection.id;
				course.push(currSection);
			} else  { // different section
				courseList.push([...course]);
				course.splice(0);
				currCourseId = currSection.id;
				course.push(currSection);
			}
		}
		courseList.push([...course]);
		return courseList;
	}

	public processSComp(sStatement: any, dataset: any): any[] {
		let outputList: any[] = [];
		let sectionList: any = Object.values(dataset)[3];
		let courses: any[] = this.convertToCourses(sectionList);
		for(let course of courses) { // iterating through courses
			for (let section of course) { // iterating through sections
				let wholeKey = Object.keys(sStatement)[0];
				let words: string[] = wholeKey.split("_");
				let field: string = words[1];
				const sectionFields: any = {
					dept: section.dept,
					id: section.id,
					instructor: section.instructor,
					title: section.title,
					uuid: section.title
				};
				let sectionValue = sectionFields[field]; // actual value
				if(sectionValue.type !== "string") {
					sectionValue = sectionValue.toString();
				}
				let match: string = Object.values(sStatement)[0] as string; // given value
				let input: string = "";
				if(match.startsWith("*") && match.endsWith("*") && match.length >= 2) { // contains input string
					input = match.substring(1, match.length - 1);
					if(sectionValue.includes(input)) {
						outputList.push(section);
					}
				} else if(match.startsWith("*")) { // Ends with input string
					input = match.substring(1, match.length);
					if(sectionValue.endsWith(input)) {
						outputList.push(section);
					}
				} else if (match.endsWith("*")) { // Starts with input string
					input = match.substring(0, match.length - 1);
					if(sectionValue.startsWith(input)) {
						outputList.push(section);
					}
				} else if (sectionValue === match) { // Matches input string exactly
					outputList.push(section);
				}
			}
		}
		return outputList;
	}


	public processNOT(notStatement: any, dataset: any): any[] { // not working

		let outputList: any[];
		let sectionList: any = Object.values(dataset)[3];
		let courses: any[] = this.convertToCourses(sectionList);
		let sections: any = [];
		let resultSections: any[] = this.processFilter(notStatement,dataset);
		for(let course of courses) {
			for (let section of course) {
				sections.push(section);
			}
		}
		outputList = sections.filter((data: any) => !resultSections.includes(data));
		return outputList;
	}

	private processCols(options: any, processedData: any[]): any[] {
		let columns = options["COLUMNS"];
		for(let k = 0; k < columns.length; k++){ // finds the wanted column names
			let wholeKey = columns[k];
			let words: string[] = wholeKey.split("_");
			let field: string = words[1];
			columns[k] = field;
		}
		 for(let section of processedData) { // sections
			 let secCols: string[] = Object.keys(section);
			 for(let col of secCols) {
				 if (!columns.includes(col)) { // checks if column is part of wanted columns
					 delete section[col];
				 } else {
					 section["sections_" + col] = section[col];
					 delete section[col];
				 }
			 }
		 }
		 return processedData;
	}

	// the logic for the sorting part of the following method was taken from this stackoverflow answer
	// https://stackoverflow.com/a/21689268
	private outputResults(options: any, columns: any): any[] {
		let ouputResults: any[];
		let order = options["ORDER"];

		if (order === undefined) {
			return columns;
		}

		// let wholeKey = order;
		// let words: string[] = wholeKey.split("_");
		let field: string = order;

		ouputResults = columns.sort((first: any,second: any) => { // sorts them in order
			const firstFields: any = {
				sections_avg: first.sections_avg,
				sections_pass: first.pass,
				sections_fail: first.fail,
				sections_audit: first.audit,
				sections_year: first.year,
				sections_dept: first.sections_dept
			};

			const secondFields: any = {
				sections_avg: second.sections_avg,
				sections_pass: second.pass,
				sections_fail: second.fail,
				sections_audit: second.audit,
				sections_year: second.year,
				sections_dept: second.sections_dept
			};

			if(firstFields[field] > secondFields[field]) {
				return 1;
			}

			if(firstFields[field] < secondFields[field]) {
				return -1;
			}

			return 0;
		});

		return ouputResults;


	}
}
