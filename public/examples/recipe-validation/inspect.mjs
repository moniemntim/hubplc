import { validateRawRecipe } from './recipe-validation.mjs';
// Edit only this teaching input to try another flat recipe-v3 JSON document.
const raw =
  '{"schema_version":"recipe-v3","recipe_id":"R7","speed":"abc","low":20,"high":10}';
console.log(JSON.stringify(validateRawRecipe(raw), null, 2));
