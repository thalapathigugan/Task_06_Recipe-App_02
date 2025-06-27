const searchBox = document.querySelector(".search-box");
const searchButton = document.querySelector(".search-button");
const recipeContainer = document.querySelector(".recipe-container");
const recipeCloseBtn = document.querySelector(".recipe-close-btn");
const recipeDetailsContent = document.querySelector(".recipe-details-content");
const centerMessage = document.querySelector(".center-message");

// Debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Debounced search function
const debouncedSearch = debounce((text) => {
  if (centerMessage) centerMessage.style.display = "none";
  if (!text.trim()) {
    recipeContainer.innerHTML = `<h2>Type the meal in the search box.</h2>`;
    return;
  }
  fetchRecipes(text);
}, 500);

const fetchIngredients = (meal) => {
  let ingredientsList = "";
  for(let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    if(ingredient) {
      const measure = meal[`strMeasure${i}`];
      ingredientsList += `<li>${measure} ${ingredient}</li>`;
    } else {
      break;
    }
  }
  return ingredientsList;
};

const openRecipePopup = (meal) => {
  recipeDetailsContent.innerHTML = `
    <h2 class="recipeName">${meal.strMeal}</h2>
    <h3>Ingredients:</h3>
    <ul class="ingredientsList">${fetchIngredients(meal)}</ul>
    <div>
      <h3>Instructions:</h3>
      <p class="recipeInstructions">${meal.strInstructions}</p>
    </div>
  `;
  recipeDetailsContent.parentElement.style.display = "block";
};

const fetchRecipes = async (query) => {
  recipeContainer.innerHTML = "<h2>Fetching Recipes...</h2>";
  try {
    const data = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
    const response = await data.json();

    recipeContainer.innerHTML = "";
    if (!response.meals) {
      recipeContainer.innerHTML = '<h2>No recipes found.</h2>';
      return;
    }
    response.meals.forEach(meal => {
      const recipeDiv = document.createElement('div');
      recipeDiv.classList.add('recipe');
      recipeDiv.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <h3>${meal.strMeal}</h3>
        <p><span>${meal.strArea}</span> Dish</p>
        <p>Belongs to <span>${meal.strCategory}</span> Category</p>
      `;
      const button = document.createElement('button');
      button.textContent = 'View Recipe';
      button.classList.add('view-recipe-btn');
      recipeDiv.appendChild(button);

      button.addEventListener('click', () => {
        openRecipePopup(meal);
      });

      recipeContainer.appendChild(recipeDiv);
    });
  } catch (error) {
    recipeContainer.innerHTML = "<h2>Error in Fetching Recipes...</h2>";
  }
};

recipeCloseBtn.addEventListener("click", () => {
  recipeDetailsContent.parentElement.style.display = "none";
});

// Add input event listener for real-time search
searchBox.addEventListener("input", function(e) {
  debouncedSearch(e.target.value);
});

// Keep the search button for manual search
searchButton.addEventListener("click", (e) => {
  e.preventDefault();
  if (centerMessage) centerMessage.style.display = "none";
  const searchInput = searchBox.value.trim();
  if(!searchInput) {
    recipeContainer.innerHTML = `<h2>Type the meal in the search box.</h2>`;
    return;
  }
  fetchRecipes(searchInput);
});