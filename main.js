const searchBox = document.querySelector(".search-box");
const searchButton = document.querySelector(".search-button");
const recipeContainer = document.querySelector(".recipe-container");
const recipeCloseBtn = document.querySelector(".recipe-close-btn");
const recipeDetailsContent = document.querySelector(".recipe-details-content");
const centerMessage = document.querySelector(".center-message");

// Get references to new buttons
const viewFavoritesBtn = document.querySelector('.view-favorites-btn');
const viewWishlistBtn = document.querySelector('.view-wishlist-btn');
const backHomeBtn = document.querySelector('.back-home-btn');

// Debounce function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Helper functions for localStorage
function getStoredRecipes(key) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function toggleRecipe(key, meal) {
  const current = getStoredRecipes(key);
  const existingIndex = current.findIndex(r => r.idMeal === meal.idMeal);
  
  if (existingIndex !== -1) {
    // Remove from storage
    current.splice(existingIndex, 1);
    localStorage.setItem(key, JSON.stringify(current));
    return false; // removed
  } else {
    // Add to storage
    current.push(meal);
    localStorage.setItem(key, JSON.stringify(current));
    return true; // added
  }
}

function isRecipeStored(key, mealId) {
  const current = getStoredRecipes(key);
  return current.some(r => r.idMeal === mealId);
}

// Function to fetch and display multiple random recipes
const fetchMultipleRandomRecipes = async (count = 8) => {
  try {
    // Hide the center message
    if (centerMessage) centerMessage.style.display = "none";
    recipeContainer.innerHTML = "<h2>Fetching Random Recipes...</h2>";

    const recipePromises = [];
    for (let i = 0; i < count; i++) {
      recipePromises.push(fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(res => res.json()));
    }
    const responses = await Promise.all(recipePromises);
    const meals = responses.map(r => r.meals && r.meals[0]).filter(Boolean);

    recipeContainer.innerHTML = "";
    if (meals.length === 0) {
      recipeContainer.innerHTML = '<h2>No random recipes found.</h2>';
      return;
    }

    meals.forEach(meal => {
      const recipeDiv = document.createElement('div');
      recipeDiv.classList.add('recipe');
      recipeDiv.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <h3>${meal.strMeal}</h3>
        <p><span>${meal.strArea}</span> Dish</p>
        <p>Belongs to <span>${meal.strCategory}</span> Category</p>
        <p style="color: #d4af37; font-style: italic; margin-top: 8px;">✨ Random Recipe of the Day ✨</p>
        <div class="recipe-buttons">
          <button class="view-recipe-btn">View Recipe</button>
          <button class="favorite-btn">${isRecipeStored('favorites', meal.idMeal) ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}</button>
          <button class="wishlist-btn">${isRecipeStored('wishlist', meal.idMeal) ? '📝 Remove from Wishlist' : '📋 Add to Wishlist'}</button>
        </div>
      `;
      
      // Add event listeners
      const viewBtn = recipeDiv.querySelector('.view-recipe-btn');
      const favBtn = recipeDiv.querySelector('.favorite-btn');
      const wishBtn = recipeDiv.querySelector('.wishlist-btn');
      
      viewBtn.addEventListener('click', () => {
        openRecipePopup(meal);
      });
      
      favBtn.addEventListener('click', () => {
        const added = toggleRecipe('favorites', meal);
        favBtn.textContent = added ? '❤️ Remove from Favorites' : '🤍 Add to Favorites';
      });
      
      wishBtn.addEventListener('click', () => {
        const added = toggleRecipe('wishlist', meal);
        wishBtn.textContent = added ? '📝 Remove from Wishlist' : '📋 Add to Wishlist';
      });

      recipeContainer.appendChild(recipeDiv);
    });
  } catch (error) {
    console.error("Error fetching random recipes:", error);
    recipeContainer.innerHTML = "<h2>Error fetching random recipes...</h2>";
  }
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
    renderRecipes(response.meals);
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

let currentView = 'home'; // 'home', 'favorites', 'wishlist'

function renderRecipes(meals, showRandomLabel = false) {
  recipeContainer.innerHTML = "";
  if (!meals || meals.length === 0) {
    recipeContainer.innerHTML = '<h2>No recipes found.</h2>';
    return;
  }
  meals.forEach(meal => {
    const recipeDiv = document.createElement('div');
    recipeDiv.classList.add('recipe');
    recipeDiv.innerHTML = `
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
      <h3>${meal.strMeal}</h3>
      <p><span>${meal.strArea}</span> Dish</p>
      <p>Belongs to <span>${meal.strCategory}</span> Category</p>
      ${showRandomLabel ? '<p style="color: #4ecdc4; font-style: italic; margin-top: 8px;">✨ Random Recipe of the Day ✨</p>' : ''}
      <div class="recipe-buttons">
        <button class="view-recipe-btn">View Recipe</button>
        <button class="favorite-btn">${isRecipeStored('favorites', meal.idMeal) ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}</button>
        <button class="wishlist-btn">${isRecipeStored('wishlist', meal.idMeal) ? '📝 Remove from Wishlist' : '📋 Add to Wishlist'}</button>
      </div>
    `;
    // Add event listeners
    const viewBtn = recipeDiv.querySelector('.view-recipe-btn');
    const favBtn = recipeDiv.querySelector('.favorite-btn');
    const wishBtn = recipeDiv.querySelector('.wishlist-btn');
    viewBtn.addEventListener('click', () => {
      openRecipePopup(meal);
    });
    favBtn.addEventListener('click', () => {
      const added = toggleRecipe('favorites', meal);
      favBtn.textContent = added ? '❤️ Remove from Favorites' : '🤍 Add to Favorites';
      if (!added) {
        recipeDiv.remove();
        if (recipeContainer.children.length === 0) {
          recipeContainer.innerHTML = '<h2>No recipes found.</h2>';
        }
      }
    });
    wishBtn.addEventListener('click', () => {
      const added = toggleRecipe('wishlist', meal);
      wishBtn.textContent = added ? '📝 Remove from Wishlist' : '📋 Add to Wishlist';
      if (!added) {
        recipeDiv.remove();
        if (recipeContainer.children.length === 0) {
          recipeContainer.innerHTML = '<h2>No recipes found.</h2>';
        }
      }
    });
    recipeContainer.appendChild(recipeDiv);
  });
}

function showFavorites() {
  if (centerMessage) centerMessage.style.display = "none";
  currentView = 'favorites';
  renderRecipes(getStoredRecipes('favorites'));
  backHomeBtn.style.display = 'inline-block';
  viewFavoritesBtn.style.display = 'none';
  viewWishlistBtn.style.display = 'none';
}

function showWishlist() {
  if (centerMessage) centerMessage.style.display = "none";
  currentView = 'wishlist';
  renderRecipes(getStoredRecipes('wishlist'));
  backHomeBtn.style.display = 'inline-block';
  viewFavoritesBtn.style.display = 'none';
  viewWishlistBtn.style.display = 'none';
}

function showHome() {
  currentView = 'home';
  fetchMultipleRandomRecipes(8);
  backHomeBtn.style.display = 'none';
  viewFavoritesBtn.style.display = 'inline-block';
  viewWishlistBtn.style.display = 'inline-block';
}

viewFavoritesBtn.addEventListener('click', showFavorites);
viewWishlistBtn.addEventListener('click', showWishlist);
backHomeBtn.addEventListener('click', showHome);

// Replace the single random recipe fetch on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  showHome();
});