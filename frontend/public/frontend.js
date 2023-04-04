function parseFormData(formData) {
	const stringFields = ["uuid", "id", "title", "instructor", "dept"]
	const numberFields = ["year", "avg", "pass", "fail", "audit"];
	const datasetName = "sections";
	let basicQuery =
		{
			"WHERE": {},
			"OPTIONS": {
				"COLUMNS": []
			}
		};
	let conditions = [];
	let columns = [];

	for (let f of stringFields) {
		if (formData.get(f) != "") {
			let basicIS = {"IS": {}};
			basicIS.IS[(datasetName + "_" + f)] = formData.get(f);
			conditions.push(basicIS);
		}
		columns.push(datasetName + "_" + f);
	}
	for (let f of numberFields) {
		if (formData.get(f) != "") {
			let basicMComp = {};
			let thing = {[(datasetName + "_" + f)]: parseInt(formData.get(f))};
			console.log(thing);
			basicMComp[formData.get(f + "-comparison")] = thing;
			conditions.push(basicMComp);
		}
		columns.push(datasetName + "_" + f);
	}
	if (conditions.length > 0) {
		basicQuery.WHERE = {
			"AND": conditions
		};
	}
	basicQuery.OPTIONS.COLUMNS = columns; // todo actually be able to select
	return basicQuery;
}

function handleQuerySubmit(event) {
	event.preventDefault();
	const formData = new FormData(event.target);
	const query = parseFormData(formData);
	console.log(query);
}

document.getElementById("query-form").addEventListener('submit', handleQuerySubmit);

// todo: send query (AJAX call)
// todo: update page
