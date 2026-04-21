const filterBarHTML = `
<div class="search-container">
    <div class="container">
        <form id="mainSearchForm" class="search-bar-wrap">
            <!-- Location Dropdown -->
            <div id="cityFilterContainer" style="position:relative; min-width:200px; background:var(--white); border:2px solid var(--primary); border-radius:4px; display:flex; align-items:center; padding:0 12px;">
                <i class="fas fa-map-marker-alt" style="color:var(--primary)"></i>
                <input type="text" id="filterCity" placeholder="Pakistan" readonly style="border:none; padding:12px; font-size:15px; outline:none; width:100%; cursor:pointer; font-weight:600;">
                <i class="fas fa-chevron-down" style="font-size:12px; color:var(--primary)"></i>
                
                <div id="cityFilterList" style="position:absolute; top:calc(100% + 8px); left:0; right:0; background:#fff; border:1px solid var(--border-light); border-radius:4px; box-shadow:var(--shadow-lg); display:none; z-index:1000; max-height:300px; overflow-y:auto;">
                    <div style="padding:12px; border-bottom:1px solid var(--border-light); position:sticky; top:0; background:#fff;">
                        <input type="text" id="cityFilterSearch" placeholder="Search city..." style="width:100%; padding:10px; border:1px solid var(--border-light); border-radius:4px; font-size:14px; outline:none;">
                    </div>
                    <div id="cityOptions"></div>
                </div>
            </div>

            <!-- Search Input -->
            <div class="search-input-group">
                <input type="text" id="filterSearch" placeholder="Find Books, Notes, Study Gear..." aria-label="Search items">
                <button type="submit" class="btn-search">
                    <i class="fas fa-search" style="font-size:18px;"></i>
                </button>
            </div>
        </form>

        <!-- Secondary Filters -->
        <div style="display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; align-items:center;">
            <span style="font-size:13px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Filters:</span>
            
            <select id="filterCategory" style="padding:8px 12px; border:1px solid var(--border-light); border-radius:4px; font-size:14px; color:var(--primary); font-weight:600; outline:none; cursor:pointer;">
                <option value="">All Categories</option>
                <option value="Books">Books</option>
                <option value="Notes">Notes</option>
                <option value="Past Papers">Past Papers</option>
                <option value="Uniform">Uniform</option>
                <option value="Gadgets">Gadgets</option>
                <option value="Study Material">Study Material</option>
                <option value="Other">Other</option>
            </select>

            <select id="filterCondition" style="padding:8px 12px; border:1px solid var(--border-light); border-radius:4px; font-size:14px; color:var(--primary); font-weight:600; outline:none; cursor:pointer;">
                <option value="">Condition</option>
                <option value="New">New</option>
                <option value="Used">Used</option>
            </select>

            <div style="display:flex; align-items:center; gap:8px; background:var(--white); border:1px solid var(--border-light); border-radius:4px; padding:0 12px;">
                <span style="font-size:13px; font-weight:700; color:var(--text-muted);">Rs</span>
                <input type="number" id="filterMinPrice" placeholder="Min" style="width:70px; border:none; padding:8px 0; font-size:14px; outline:none;">
                <span style="color:var(--border-light);">|</span>
                <input type="number" id="filterMaxPrice" placeholder="Max" style="width:70px; border:none; padding:8px 0; font-size:14px; outline:none;">
            </div>

            <select id="filterSort" style="padding:8px 12px; border:1px solid var(--border-light); border-radius:4px; font-size:14px; color:var(--primary); font-weight:600; outline:none; cursor:pointer; margin-left:auto;">
                <option value="latest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
            </select>
        </div>
    </div>
</div>
`;

function initFilters(containerId, institution, onResult) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = filterBarHTML;

    const els = {
        form: document.getElementById('mainSearchForm'),
        search: document.getElementById('filterSearch'),
        category: document.getElementById('filterCategory'),
        condition: document.getElementById('filterCondition'),
        city: document.getElementById('filterCity'),
        cityList: document.getElementById('cityFilterList'),
        citySearch: document.getElementById('cityFilterSearch'),
        cityOptions: document.getElementById('cityOptions'),
        minPrice: document.getElementById('filterMinPrice'),
        maxPrice: document.getElementById('filterMaxPrice'),
        sort: document.getElementById('filterSort')
    };

    // Initialize search value from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('search')) els.search.value = urlParams.get('search');
    if (urlParams.has('category')) els.category.value = urlParams.get('category');
    if (urlParams.has('minPrice')) els.minPrice.value = urlParams.get('minPrice');
    if (urlParams.has('maxPrice')) els.maxPrice.value = urlParams.get('maxPrice');
    if (urlParams.has('city')) {
        els.city.value = urlParams.get('city');
        els.city.placeholder = urlParams.get('city');
    }
    
    // Support institution from URL if not hardcoded
    let activeInstitution = institution || urlParams.get('institution') || '';

    function renderCities(filter = '') {
        els.cityOptions.innerHTML = '';
        const cities = ['All Pakistan', ...(window.pakistanCities || [])].filter(c => c.toLowerCase().includes(filter.toLowerCase()));
        cities.forEach(name => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = name;
            btn.style.cssText = "width:100%; text-align:left; background:transparent; border:0; padding:12px 16px; cursor:pointer; font-size:14px; color:var(--text-main); font-weight:500;";
            btn.addEventListener('mouseover', () => btn.style.background = '#f2f4f5');
            btn.addEventListener('mouseout', () => btn.style.background = 'transparent');
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                els.city.value = name === 'All Pakistan' ? '' : name;
                els.city.placeholder = name;
                els.cityList.style.display = 'none';
                applyFilters();
            });
            els.cityOptions.appendChild(btn);
        });
    }

    els.city.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = els.cityList.style.display === 'block';
        els.cityList.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
            els.citySearch.value = '';
            renderCities();
            els.citySearch.focus();
        }
    });

    els.citySearch.addEventListener('input', (e) => renderCities(e.target.value));
    document.addEventListener('click', (e) => { 
        if (els.cityList && !document.getElementById('cityFilterContainer').contains(e.target)) {
            els.cityList.style.display = 'none';
        }
    });

    async function applyFilters(e) {
        if (e) e.preventDefault();
        
        const params = new URLSearchParams();
        if (activeInstitution) params.append('institution', activeInstitution);
        if (els.search.value) params.append('search', els.search.value);
        if (els.category.value) params.append('category', els.category.value);
        if (els.condition.value) params.append('condition', els.condition.value);
        if (els.city.value) params.append('city', els.city.value);
        if (els.minPrice.value) params.append('minPrice', els.minPrice.value);
        if (els.maxPrice.value) params.append('maxPrice', els.maxPrice.value);
        if (els.sort.value) params.append('sort', els.sort.value);

        // Update URL without reloading
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        try {
            const res = await fetch(`/api/items?${params.toString()}`);
            const data = await res.json();
            onResult(data.items || []);
        } catch (e) {
            console.error('Filter error:', e);
            onResult([]);
        }
    }

    els.form.addEventListener('submit', applyFilters);
    [els.category, els.condition, els.sort].forEach(el => {
        el.addEventListener('change', () => applyFilters());
    });

    // Real-time updates for price and search
    let debounceTimer;
    [els.search, els.minPrice, els.maxPrice].forEach(el => {
        el.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => applyFilters(), 500);
        });
    });

    // Initial load
    applyFilters();
}

window.initFilters = initFilters;
