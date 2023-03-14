

export default abstract class FacadeHelper {

	public static sortOptions(columns: string[], direction: string | null, anyKeyList: any[], results: any[]): any[] {
		let output: any;
		let order = anyKeyList[0];
		let words: string[] = order.split("_");
		let id: string = words[0];
		let field: string = words[1];
		if(direction === null) {
			output = results.sort(FacadeHelper.getSortingFunction(id, field, anyKeyList));
		} else {
			output = results.sort(FacadeHelper.getSortingFunction(id, field, anyKeyList));
		}
		if (direction === "DOWN") {
			return output.reverse();
		}
		return output;
	}

	private static getSortingFunction(id: string, field: string,  anyKeyList: any[]) {
		return (first: any, second: any) => {
			const firstFields: any = {};
			const secondFields: any = {};
			const firstKeys = Object.keys(first).filter((key) => key.startsWith(id));
			const secondKeys = Object.keys(second).filter((key) => key.startsWith(id));
			for(const key of firstKeys) {
				const columnField: string = key.split("_")[1];
				firstFields[columnField] = first[key];
			}
			for(const key of secondKeys) {
				const columnField: string = key.split("_")[1];
				secondFields[columnField] = second[key];
			}
			if(firstFields[field] > secondFields[field]) {
				return 1;
			}
			if(firstFields[field] < secondFields[field]) {
				return -1;
			}
			if(firstFields[field] === secondFields[field]) {
				return FacadeHelper.breakTie(first, second, anyKeyList);
			}
			return 0;
		};
	}

	private static breakTie(first: any, second: any, anyKeys: any[]): number {
		for( let i = 1; i < anyKeys.length; i++) {
			let order = anyKeys[i];
			let words: string[] = order.split("_");
			let id: string = words[0];
			let field: string = words[1];
			const firstFields: any = {};
			const secondFields: any = {};
			const firstKeys = Object.keys(first).filter((key) => key.startsWith(id));
			const secondKeys = Object.keys(second).filter((key) => key.startsWith(id));
			for(const key of firstKeys) {
				const columnField: string = key.split("_")[1];
				firstFields[columnField] = first[key];
			}
			for(const key of secondKeys) {
				const columnField: string = key.split("_")[1];
				secondFields[columnField] = second[key];
			}
			if(firstFields[field] > secondFields[field]) {
				return 1;
			}
			if(firstFields[field] < secondFields[field]) {
				return -1;
			}
		}
		return 0;
	}
}
