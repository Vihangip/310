
export default class IsQueryValid {

	private id: string = "";
	constructor() {
		console.log("Checking if query is valid");
	}

	public isValid(query: any): any[] {
		try {
			const queryAsString: string  = JSON.stringify(query);
			JSON.parse(queryAsString);
		} catch (err) {
			return [false,0];
		}

		if (!("WHERE" in query) || !("OPTIONS" in query)){
			return [false,0];
		}

		if (Object.keys(query).length > 2) {
			return [false,0]; // more than BODY and OPTIONS
		}

		if ("OPTIONS" in query) {
			if(this.checkValidOptions(query["OPTIONS"])){
				if(this.checkValidFilter(query["WHERE"])){
					return [true,this.id];
				}
			}
		}

		if ("WHERE" in query) {
			if(this.checkValidFilter(query["WHERE"])) {
				return [true, this.id];
			}
		}

		return [false,0];
	}

	public checkValidFilter(whereStatement: any): boolean {
		if ("AND" in whereStatement) {
			return this.logicComparison(whereStatement["AND"]);
		} else if ("OR" in whereStatement) {
			return this.logicComparison(whereStatement["OR"]);
		} else if ("LT" in whereStatement) {
			return this.mComparison(whereStatement["LT"]);
		} else if ("GT" in whereStatement) {
			return this.mComparison(whereStatement["GT"]);
		} else if ("EQ" in whereStatement) {
			return this.mComparison(whereStatement["EQ"]);
		} else if ("IS" in whereStatement) {
			return this.sComparison(whereStatement["IS"]);
		} else if ("NOT" in whereStatement) {
			return this.checkValidFilter(whereStatement["NOT"]);
		} else {
			return false;
		}
	}

	public logicComparison(logic: any): boolean {
		if (Array.isArray(logic)) {
			for (let statement of logic) {
				if (!(this.checkValidFilter(statement))) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	public mComparison(m: any): boolean {
		let mKeys: any = Object.keys(m);
		if (!(mKeys.length === 1) || !(typeof Object.values(m)[0] === "number")) {
			return false;
		} else {
			let mKey: any = mKeys[0];
			let underscore: number = mKey.indexOf("_");
			let idString: string = mKey.substring(0, underscore);
			let mField: string = mKey.substring(underscore + 1, mKey.length);

			return this.isIDStringValid(idString) && this.isMFieldValid(mField);
		}
	}

	public sComparison(s: any): boolean {
		let sKeys: any = Object.keys(s);
		let sKeyValue: any = Object.values(s);
		if (!(sKeys.length === 1) || !(typeof sKeyValue[0] === "string")) {
			return false;
		} else if (sKeyValue[0].substring(1, sKeyValue[0].length - 1).includes("*")) {
			return false;
		} else {
			let sKey: any = sKeys[0];
			let underscore: number = sKey.indexOf("_");
			let idString: string = sKey.substring(0, underscore);
			let sField: string = sKey.substring(underscore + 1, sKey.length);

			return this.isIDStringValid(idString) && this.isSFieldValid(sField);
		}
	}
	//

	public isIDStringValid(idString: string): boolean {
		if(!(idString.includes("_") || idString.trim().length === 0)){
			this.id = idString;
			return true;
		}
		return false;
	}

	public isMFieldValid(mField: string): boolean {
		return mField === "avg" || mField === "pass" || mField === "fail" || mField === "audit" || mField === "year";
	}

	public isSFieldValid(sField: string): boolean {
		return sField === "dept" || sField === "id" || sField === "instructor" || sField === "title"
			|| sField === "uuid";
	}

	public checkValidOptions(queryElement: any): boolean {
		let keys: any = Object.keys(queryElement);
		if (keys.length === 1) {
			if (keys[0] === "COLUMNS") {
				return this.isColumnsValid(queryElement["COLUMNS"]);
			} else {
				return false;
			}
		} else if (keys.length === 2) {
			if (keys[0] === "COLUMNS" && keys[1] === "ORDER") {
				return this.isColumnsValid(queryElement["COLUMNS"]) && this.isOrderValid(queryElement);
			} else {
				return false;
			}
		} else {
			return false;
		}
	}

	public isColumnsValid(cols: any): boolean {
		if (Array.isArray(cols)) {
			for (let key of cols) {
				if(!(this.isKeyValid(key))) {
					return false;
				}
			}
			return true;
		}
		return false;
	}


	public isOrderValid(options: any): boolean {
		let columnKeyList: any = options["COLUMNS"];
		let orderKey: any = options["ORDER"];

		if (this.isKeyValid(orderKey)) {
			return columnKeyList.includes(orderKey);
		}
		return false;
	}

	public isKeyValid(key: any): boolean {
		if (typeof key === "string" && key.includes("_")) {
			let stringField: string[] = key.split("_");
			if (stringField.length !== 2) {
				return false;
			}
			return this.isIDStringValid(stringField[0]) &&
				(this.isMFieldValid(stringField[1]) || this.isSFieldValid(stringField[1]));
		}
		return false;
	}
}
