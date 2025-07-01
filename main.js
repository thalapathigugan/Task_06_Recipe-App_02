document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const searchBox = document.querySelector(".search-box");
  const recipeContainer = document.querySelector(".recipe-container");
  const recipeCloseBtn = document.querySelector(".recipe-close-btn");
  const recipeDetailsContent = document.querySelector(".recipe-details-content");
  const centerMessage = document.querySelector(".center-message");
  const paginationContainer = document.querySelector('.pagination-container');
  const categoriesSelect = document.querySelector('.categories-select');
  const cartCountBadge = document.querySelector('.cart-count-badge');

  // Get references to new buttons
  const viewFavoritesBtn = document.querySelector('.view-favorites-btn');
  const refreshHomeBtn = document.querySelector('.refresh-home-btn');

  // Pagination state
  let currentPage = 1;
  const RECIPES_PER_PAGE = 20;
  let allRecipes = [];
  let isHome = true;

  let currentCategory = null;

  // URL state management
  function updateURL(page = currentPage, category = currentCategory, view = 'home') {
    const url = new URL(window.location);
    url.searchParams.set('page', page);
    if (category) {
      url.searchParams.set('category', category);
    } else {
      url.searchParams.delete('category');
    }
    url.searchParams.set('view', view);
    window.history.pushState({}, '', url);
  }

  function getURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      page: parseInt(urlParams.get('page')) || 1,
      category: urlParams.get('category') || null,
      view: urlParams.get('view') || 'home'
    };
  }

  function restoreStateFromURL() {
    const params = getURLParams();
    currentPage = params.page;
    currentCategory = params.category;
    
    // Check if there's a search term in the URL
    const searchTerm = new URLSearchParams(window.location.search).get('search');
    
    switch (params.view) {
      case 'favorites':
        if (searchTerm) {
          searchBox.value = searchTerm;
          searchWithinFavorites(searchTerm);
        } else {
          showFavorites();
        }
        break;
      case 'cart':
        if (searchTerm) {
          searchBox.value = searchTerm;
          searchWithinCart(searchTerm);
        } else {
          showCart();
        }
        break;
      case 'category':
        if (currentCategory) {
          setActiveCategory(currentCategory);
          fetchCategoryRecipes(currentCategory);
        } else {
          showHome();
        }
        break;
      case 'search':
        // For search, we'll need to restore the search term
        if (searchTerm) {
          searchBox.value = searchTerm;
          fetchRecipes(searchTerm);
        } else {
          showHome();
        }
        break;
      default:
        showHome();
        break;
    }
  }

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

  function renderPagination(total, current) {
    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(total / RECIPES_PER_PAGE);
    if (totalPages <= 1) return;

    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = current === 1;
    prevBtn.addEventListener('click', () => {
      if (current > 1) {
        currentPage = current - 1;
        updateURL(currentPage, currentCategory, isHome ? 'home' : 'category');
        renderRecipes(allRecipes, false);
        renderPagination(allRecipes.length, currentPage);
      }
    });
    paginationContainer.appendChild(prevBtn);

    // Page number buttons
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = 'pagination-btn' + (i === current ? ' active' : '');
      btn.textContent = i;
      btn.addEventListener('click', () => {
        currentPage = i;
        updateURL(currentPage, currentCategory, isHome ? 'home' : 'category');
        renderRecipes(allRecipes, false);
        renderPagination(allRecipes.length, currentPage);
      });
      paginationContainer.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = current === totalPages;
    nextBtn.addEventListener('click', () => {
      if (current < totalPages) {
        currentPage = current + 1;
        updateURL(currentPage, currentCategory, isHome ? 'home' : 'category');
        renderRecipes(allRecipes, false);
        renderPagination(allRecipes.length, currentPage);
      }
    });
    paginationContainer.appendChild(nextBtn);
  }

  // Favorite logic
  function getStoredFavorites() {
    return JSON.parse(localStorage.getItem('favorites') || '[]');
  }
  function setStoredFavorites(favs) {
    localStorage.setItem('favorites', JSON.stringify(favs));
  }
  function isFavorite(mealId) {
    return getStoredFavorites().some(r => r.idMeal === mealId);
  }
  function toggleFavorite(meal) {
    let favs = getStoredFavorites();
    const idx = favs.findIndex(r => r.idMeal === meal.idMeal);
    if (idx !== -1) {
      favs.splice(idx, 1);
    } else {
      favs.push(meal);
    }
    setStoredFavorites(favs);
  }

  // Cart logic
  function getStoredCart() {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  }
  function setStoredCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }
  function isInCart(mealId) {
    return getStoredCart().some(r => r.idMeal === mealId);
  }
  function toggleCart(meal) {
    let cart = getStoredCart();
    const idx = cart.findIndex(r => r.idMeal === meal.idMeal);
    if (idx !== -1) {
      cart.splice(idx, 1);
    } else {
      cart.push(meal);
    }
    setStoredCart(cart);
    updateCartCountBadge();
  }

  function updateCartCountBadge() {
    const count = getStoredCart().length;
    cartCountBadge.textContent = count > 0 ? count : '';
  }

  // Search within favorites
  function searchWithinFavorites(searchTerm) {
    const favorites = getStoredFavorites();
    const filteredFavorites = favorites.filter(recipe => 
      recipe.strMeal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.strCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.strArea?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    allRecipes = filteredFavorites;
    currentPage = 1;
    updateURL(1, null, 'favorites');
    const url = new URL(window.location);
    url.searchParams.set('search', searchTerm);
    window.history.pushState({}, '', url);
    
    if (filteredFavorites.length === 0) {
      centerMessage.innerHTML = `<h2>No favorites found matching "${searchTerm}".</h2>`;
      paginationContainer.innerHTML = '';
    } else {
      renderFavorites(filteredFavorites);
      renderPagination(filteredFavorites.length, currentPage);
    }
  }

  // Search within cart
  function searchWithinCart(searchTerm) {
    const cart = getStoredCart();
    const filteredCart = cart.filter(recipe => 
      recipe.strMeal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.strCategory?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.strArea?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    allRecipes = filteredCart;
    currentPage = 1;
    updateURL(1, null, 'cart');
    const url = new URL(window.location);
    url.searchParams.set('search', searchTerm);
    window.history.pushState({}, '', url);
    
    if (filteredCart.length === 0) {
      centerMessage.innerHTML = `<h2>No cart items found matching "${searchTerm}".</h2>`;
      paginationContainer.innerHTML = '';
    } else {
      renderCart(filteredCart);
      renderPagination(filteredCart.length, currentPage);
    }
  }

  function renderRecipes(meals, showRandomLabel = false) {
    recipeContainer.innerHTML = "";
    if (!meals || meals.length === 0) {
      centerMessage.innerHTML = '<h2>No recipes found.</h2>';
      paginationContainer.innerHTML = '';
      return;
    }
    const start = (currentPage - 1) * RECIPES_PER_PAGE;
    const end = start + RECIPES_PER_PAGE;
    const pageMeals = meals.slice(start, end);
    pageMeals.forEach(meal => {
      const fav = isFavorite(meal.idMeal);
      const inCart = isInCart(meal.idMeal);
      const recipeDiv = document.createElement('div');
      recipeDiv.classList.add('recipe');
      recipeDiv.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <h3>${meal.strMeal}</h3>
        <p><span>${meal.strArea}</span> Dish</p>
        <p>Belongs to <span>${meal.strCategory || ''}</span> Category</p>
        ${showRandomLabel ? '<p style="color: #4ecdc4; font-style: italic; margin-top: 8px;">✨ Random Recipe of the Day ✨</p>' : ''}
        <div class="recipe-buttons">
          <button class="view-recipe-btn">View Recipe</button>
        </div>
        <div class="favorite-cart-controls">
          <button class="favorite-btn" title="Toggle Favorite">
            ${fav ? `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
            : `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`}
          </button>
          <button class="cart-btn" title="Add to Cart">
            ${inCart ? `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#3498db"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`
            : `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`}
          </button>
        </div>
      `;
      const viewBtn = recipeDiv.querySelector('.view-recipe-btn');
      viewBtn.addEventListener('click', () => {
        openRecipePopup(meal);
      });
      const favBtn = recipeDiv.querySelector('.favorite-btn');
      favBtn.addEventListener('click', () => {
        toggleFavorite(meal);
        favBtn.innerHTML = isFavorite(meal.idMeal)
          ? `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
          : `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        showToast(isFavorite(meal.idMeal) ? 'Added to Favorites' : 'Removed from Favorites');
      });
      const cartBtn = recipeDiv.querySelector('.cart-btn');
      cartBtn.addEventListener('click', () => {
        toggleCart(meal);
        cartBtn.innerHTML = isInCart(meal.idMeal)
          ? `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#3498db"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`
          : `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`;
        showToast(isInCart(meal.idMeal) ? 'Added to Cart' : 'Removed from Cart');
      });
      recipeContainer.appendChild(recipeDiv);
    });
    renderPagination(meals.length, currentPage);
  }

  // Remove refreshHomeBtn logic
  // On home, fetch all recipes for the default search and paginate them
  function fetchDefaultHomeRecipes() {
    centerMessage.innerHTML = "<h2>Loading Recipes...</h2>";
    paginationContainer.innerHTML = '';
    fetch('https://www.themealdb.com/api/json/v1/1/search.php?s=')
      .then(res => res.json())
      .then(data => {
        if (!data.meals) {
          centerMessage.innerHTML = '<h2>No recipes found.</h2>';
          paginationContainer.innerHTML = '';
          return;
        }
        allRecipes = data.meals; // Use all results for more pages
        currentPage = 1;
        isHome = true;
        renderRecipes(allRecipes, false);
        renderPagination(allRecipes.length, currentPage);
      })
      .catch(() => {
        centerMessage.innerHTML = '<h2>Error loading recipes.</h2>';
        paginationContainer.innerHTML = '';
      });
  }

  function showHome() {
    currentCategory = null;
    isHome = true;
    updateURL(currentPage, null, 'home');
    fetchDefaultHomeRecipes();
  }

  // Debounced search function
  const debouncedSearch = debounce((text) => {
    if (centerMessage) centerMessage.style.display = "none";
    if (!text.trim()) {
      // Restore the current view when search is cleared
      const urlParams = new URLSearchParams(window.location.search);
      const currentView = urlParams.get('view') || 'home';
      
      switch (currentView) {
        case 'favorites':
          showFavorites();
          break;
        case 'cart':
          showCart();
          break;
        case 'category':
          if (currentCategory) {
            fetchCategoryRecipes(currentCategory);
          } else {
            showHome();
          }
          break;
        default:
          showHome();
          break;
      }
      return;
    }
    
    // Get current view to determine search context
    const urlParams = new URLSearchParams(window.location.search);
    const currentView = urlParams.get('view') || 'home';
    
    if (currentView === 'favorites') {
      // Search within favorites
      searchWithinFavorites(text);
    } else if (currentView === 'cart') {
      // Search within cart
      searchWithinCart(text);
    } else {
      // Regular search for home/category/search views
      isHome = false;
      updateURL(1, null, 'search');
      const url = new URL(window.location);
      url.searchParams.set('search', text);
      window.history.pushState({}, '', url);
      fetchRecipes(text);
    }
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

  // Update fetchRecipes for search pagination
  const fetchRecipes = async (query) => {
    recipeContainer.innerHTML = "<h2>Fetching Recipes...</h2>";
    paginationContainer.innerHTML = '';
    try {
      const data = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
      const response = await data.json();
      recipeContainer.innerHTML = "";
      if (!response.meals) {
        recipeContainer.innerHTML = '<h2>No recipes found.</h2>';
        paginationContainer.innerHTML = '';
        return;
      }
      allRecipes = response.meals;
      currentPage = 1;
      isHome = false;
      renderRecipes(allRecipes);
      renderPagination(allRecipes.length, currentPage);
    } catch (error) {
      centerMessage.innerHTML = "<h2>Error in Fetching Recipes...</h2>";
      paginationContainer.innerHTML = '';
    }
  };

  recipeCloseBtn.addEventListener("click", () => {
    recipeDetailsContent.parentElement.style.display = "none";
  });

  // Remove search button event listener and update input event logic
  searchBox.addEventListener("input", function(e) {
    const value = e.target.value;
    debouncedSearch(value);
  });

  let currentView = 'home'; // 'home', 'favorites'

  async function fetchAndRenderCategories() {
    try {
      const res = await fetch('https://www.themealdb.com/api/json/v1/1/categories.php');
      const data = await res.json();
      if (data.categories && data.categories.length) {
        // Clear existing options except the first two
        while (categoriesSelect.children.length > 2) {
          categoriesSelect.removeChild(categoriesSelect.lastChild);
        }
        
        // Add category options
        data.categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat.strCategory;
          option.textContent = cat.strCategory;
          categoriesSelect.appendChild(option);
        });
      }
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  }

  function setActiveCategory(category) {
    // Update the select element to show the active category
    if (categoriesSelect) {
      categoriesSelect.value = category || '';
    }
  }

  // Categories select change event
  categoriesSelect.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value === '__all__' || value === '') {
      showHome();
      return;
    }
    if (value) {
      currentCategory = value;
      isHome = false;
      updateURL(1, value, 'category');
      fetchCategoryRecipes(value);
      setActiveCategory(value);
    }
  });

  async function fetchCategoryRecipes(category) {
    centerMessage.innerHTML = "<h2>Fetching Recipes...</h2>";
    paginationContainer.innerHTML = '';
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${encodeURIComponent(category)}`);
      const data = await res.json();
      if (!data.meals) {
        centerMessage.innerHTML = '<h2>No recipes found.</h2>';
        paginationContainer.innerHTML = '';
        return;
      }
      allRecipes = data.meals;
      currentPage = 1;
      isHome = false;
      renderCategoryRecipes(allRecipes);
      renderPagination(allRecipes.length, currentPage);
    } catch (e) {
      centerMessage.innerHTML = '<h2>Error fetching category recipes.</h2>';
      paginationContainer.innerHTML = '';
    }
  }

  function renderCategoryRecipes(meals) {
    recipeContainer.innerHTML = "";
    if (!meals || meals.length === 0) {
      centerMessage.innerHTML = '<h2>No recipes found.</h2>';
      paginationContainer.innerHTML = '';
      return;
    }
    const start = (currentPage - 1) * RECIPES_PER_PAGE;
    const end = start + RECIPES_PER_PAGE;
    const pageMeals = meals.slice(start, end);
    pageMeals.forEach(meal => {
      const fav = isFavorite(meal.idMeal);
      const inCart = isInCart(meal.idMeal);
      const recipeDiv = document.createElement('div');
      recipeDiv.classList.add('recipe');
      recipeDiv.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <h3>${meal.strMeal}</h3>
        <p>Category: <span>${currentCategory}</span></p>
        <div class="recipe-buttons">
          <button class="view-recipe-btn">View Recipe</button>
          <button class="favorite-btn" title="Toggle Favorite">
            ${fav ? `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
            : `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`}
          </button>
          <button class="cart-btn" title="Add to Cart">
            ${inCart ? `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#3498db"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`
            : `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`}
          </button>
        </div>
      `;
      const viewBtn = recipeDiv.querySelector('.view-recipe-btn');
      viewBtn.addEventListener('click', () => {
        fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`)
          .then(res => res.json())
          .then(data => {
            if (data.meals && data.meals[0]) openRecipePopup(data.meals[0]);
          });
      });
      const favBtn = recipeDiv.querySelector('.favorite-btn');
      favBtn.addEventListener('click', () => {
        toggleFavorite(meal);
        favBtn.innerHTML = isFavorite(meal.idMeal)
          ? `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
          : `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        showToast(isFavorite(meal.idMeal) ? 'Added to Favorites' : 'Removed from Favorites');
      });
      const cartBtn = recipeDiv.querySelector('.cart-btn');
      cartBtn.addEventListener('click', () => {
        toggleCart(meal);
        cartBtn.innerHTML = isInCart(meal.idMeal)
          ? `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#3498db"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`
          : `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`;
        showToast(isInCart(meal.idMeal) ? 'Added to Cart' : 'Removed from Cart');
      });
      recipeContainer.appendChild(recipeDiv);
    });
    renderPagination(meals.length, currentPage);
  }

  // Patch pagination to work for all views with URL parameters
  const oldRenderPagination = renderPagination;
  renderPagination = function(total, current) {
    oldRenderPagination(total, current);
    
    // Get current view from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentView = urlParams.get('view') || 'home';
    
    document.querySelectorAll('.pagination-btn').forEach(btn => {
      if (!isNaN(btn.textContent)) {
        btn.onclick = () => {
          currentPage = parseInt(btn.textContent);
          updateURL(currentPage, currentCategory, currentView);
          
          switch (currentView) {
            case 'category':
              renderCategoryRecipes(allRecipes);
              break;
            case 'favorites':
              renderFavorites(allRecipes);
              break;
            case 'cart':
              renderCart(allRecipes);
              break;
            case 'search':
              renderRecipes(allRecipes, false);
              break;
            default:
              renderRecipes(allRecipes, false);
              break;
          }
          renderPagination(allRecipes.length, currentPage);
        };
      }
    });
    
    // Patch prev/next buttons
    const btns = document.querySelectorAll('.pagination-btn');
    if (btns.length) {
      const prevBtn = btns[0];
      const nextBtn = btns[btns.length-1];
      
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          updateURL(currentPage, currentCategory, currentView);
          
          switch (currentView) {
            case 'category':
              renderCategoryRecipes(allRecipes);
              break;
            case 'favorites':
              renderFavorites(allRecipes);
              break;
            case 'cart':
              renderCart(allRecipes);
              break;
            case 'search':
              renderRecipes(allRecipes, false);
              break;
            default:
              renderRecipes(allRecipes, false);
              break;
          }
          renderPagination(allRecipes.length, currentPage);
        }
      };
      
      nextBtn.onclick = () => {
        const totalPages = Math.ceil(allRecipes.length / RECIPES_PER_PAGE);
        if (currentPage < totalPages) {
          currentPage++;
          updateURL(currentPage, currentCategory, currentView);
          
          switch (currentView) {
            case 'category':
              renderCategoryRecipes(allRecipes);
              break;
            case 'favorites':
              renderFavorites(allRecipes);
              break;
            case 'cart':
              renderCart(allRecipes);
              break;
            case 'search':
              renderRecipes(allRecipes, false);
              break;
            default:
              renderRecipes(allRecipes, false);
              break;
          }
          renderPagination(allRecipes.length, currentPage);
        }
      };
    }
  };

  fetchAndRenderCategories();
  
  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    restoreStateFromURL();
  });
  
  // Initialize based on URL or show home
  if (window.location.search) {
    restoreStateFromURL();
  } else {
    showHome();
  }

  // Add View Favorites logic
  function showFavorites() {
    currentCategory = null;
    isHome = false;
    updateURL(1, null, 'favorites');
    allRecipes = getStoredFavorites();
    currentPage = 1;
    renderFavorites(allRecipes);
    renderPagination(allRecipes.length, currentPage);
  }

  function renderFavorites(meals) {
    recipeContainer.innerHTML = "";
    if (!meals || meals.length === 0) {
      centerMessage.innerHTML = '<h2>No favorite recipes found.</h2>';
      paginationContainer.innerHTML = '';
      return;
    }
    const start = (currentPage - 1) * RECIPES_PER_PAGE;
    const end = start + RECIPES_PER_PAGE;
    const pageMeals = meals.slice(start, end);
    pageMeals.forEach(meal => {
      const fav = isFavorite(meal.idMeal);
      const inCart = isInCart(meal.idMeal);
      const recipeDiv = document.createElement('div');
      recipeDiv.classList.add('recipe');
      recipeDiv.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <h3>${meal.strMeal}</h3>
        <p><span>${meal.strArea}</span> Dish</p>
        <p>Belongs to <span>${meal.strCategory || ''}</span> Category</p>
        <div class="recipe-buttons">
          <button class="view-recipe-btn">View Recipe</button>
          <button class="favorite-btn" title="Toggle Favorite">
            <svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          <button class="cart-btn" title="Add to Cart">
            ${inCart ? `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#3498db"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`
            : `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`}
          </button>
        </div>
      `;
      const viewBtn = recipeDiv.querySelector('.view-recipe-btn');
      viewBtn.addEventListener('click', () => {
        openRecipePopup(meal);
      });
      const favBtn = recipeDiv.querySelector('.favorite-btn');
      favBtn.addEventListener('click', () => {
        toggleFavorite(meal);
        favBtn.innerHTML = isFavorite(meal.idMeal)
          ? `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ff6b6b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
          : `<svg class='heart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        showToast(isFavorite(meal.idMeal) ? 'Added to Favorites' : 'Removed from Favorites');
      });
      const cartBtn = recipeDiv.querySelector('.cart-btn');
      cartBtn.addEventListener('click', () => {
        toggleCart(meal);
        cartBtn.innerHTML = isInCart(meal.idMeal)
          ? `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#3498db"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`
          : `<svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>`;
        showToast(isInCart(meal.idMeal) ? 'Added to Cart' : 'Removed from Cart');
      });
      recipeContainer.appendChild(recipeDiv);
    });
    renderPagination(meals.length, currentPage);
  }

  viewFavoritesBtn.addEventListener('click', showFavorites);

  // Add View Cart logic
  function showCart() {
    currentCategory = null;
    isHome = false;
    updateURL(1, null, 'cart');
    allRecipes = getStoredCart();
    currentPage = 1;
    renderCart(allRecipes);
    renderPagination(allRecipes.length, currentPage);
  }

  function renderCart(meals) {
    recipeContainer.innerHTML = "";
    if (!meals || meals.length === 0) {
      centerMessage.innerHTML = '<h2>No cart recipes found.</h2>';
      paginationContainer.innerHTML = '';
      return;
    }
    const start = (currentPage - 1) * RECIPES_PER_PAGE;
    const end = start + RECIPES_PER_PAGE;
    const pageMeals = meals.slice(start, end);
    pageMeals.forEach(meal => {
      const recipeDiv = document.createElement('div');
      recipeDiv.classList.add('recipe');
      recipeDiv.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <h3>${meal.strMeal}</h3>
        <p><span>${meal.strArea}</span> Dish</p>
        <p>Belongs to <span>${meal.strCategory || ''}</span> Category</p>
        <div class="recipe-buttons">
          <button class="view-recipe-btn">View Recipe</button>
          <button class="cart-btn" title="Remove from Cart">
            <svg class='cart-icon' xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#3498db"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61l1.38-7.39H6"/></svg>
          </button>
        </div>
      `;
      const viewBtn = recipeDiv.querySelector('.view-recipe-btn');
      viewBtn.addEventListener('click', () => {
        openRecipePopup(meal);
      });
      const cartBtn = recipeDiv.querySelector('.cart-btn');
      cartBtn.addEventListener('click', () => {
        toggleCart(meal);
        recipeDiv.remove();
        if (recipeContainer.children.length === 0) {
          centerMessage.innerHTML = '<h2>No cart recipes found.</h2>';
        }
      });
              recipeContainer.appendChild(recipeDiv);
    });
    renderPagination(meals.length, currentPage);
  }

  document.querySelector('.view-cart-btn').addEventListener('click', showCart);

  // Also call updateCartCountBadge on page load
  updateCartCountBadge();

  // Toast notification function
  function showToast(message) {
    const toaster = document.querySelector('.toaster');
    if (!toaster) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toaster.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 1500);
  }
});