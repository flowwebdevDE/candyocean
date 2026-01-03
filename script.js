        // --- KONFIGURATION & DATEN ---
        const config = {
            // Währungs-Konfiguration (Basis: EUR)
            currencyRates: {
                'DE': { code: 'EUR', symbol: '€', rate: 1 },
                'AT': { code: 'EUR', symbol: '€', rate: 1 },
                'CH': { code: 'CHF', symbol: 'CHF', rate: 0.96 }, // Beispielkurs
                'default': { code: 'EUR', symbol: '€', rate: 1 }
            },
            // Lokalisierte Texte pro Land
            locales: {
                'DE': {
                    heroTitle: "Süße Träume werden wahr",
                    heroText: "Entdecke handgemachte Bonbons, feinste Schokolade und die besten Leckereien der Welt.",
                    cartTitle: "Dein Warenkorb 🛒"
                },
                'AT': {
                    heroTitle: "Feine Schmankerl für dich",
                    heroText: "Entdecke handgemachte Zuckerl, feinste Schokolade und die besten Naschereien aus aller Welt.",
                    cartTitle: "Dein Einkaufskorb 🛒"
                },
                'CH': {
                    heroTitle: "Süsses für Geniesser",
                    heroText: "Entdecke handgemachte Bonbons, feinste Schoggi und die besten Leckereien.",
                    cartTitle: "Din Warenkorb 🛒"
                }
            }
        };

        // --- APP LOGIK ---
        const app = {
            cart: [],
            currentStep: 1,
            currentProductId: null,
            discount: null, // Aktueller Rabatt
            selectedCountry: 'DE',
            favorites: [],
            lastOrderId: null,
            lastOrder: null, // Speichert Details für Rechnung
            trackingInterval: null,
            filterState: {
                category: 'Alle',
                search: '',
                sort: 'default'
            },

            checkPreviewAccess() {
                const pass = document.getElementById('preview-pass').value;
                // Einfaches Passwort für die Preview
                if (pass.toLowerCase() === 'preview') {
                    document.getElementById('preview-login').style.display = 'none';
                    sessionStorage.setItem('preview_access', 'true');
                } else {
                    document.getElementById('login-error').style.display = 'block';
                }
            },

            init() {
                // Prüfen ob bereits eingeloggt
                if (sessionStorage.getItem('preview_access') === 'true') {
                    const loginOverlay = document.getElementById('preview-login');
                    if (loginOverlay) loginOverlay.style.display = 'none';
                }

                // Load favorites
                const savedFavs = localStorage.getItem('shopFavorites');
                if (savedFavs) {
                    this.favorites = JSON.parse(savedFavs);
                }

                this.renderProducts();
                this.updateCartUI();
                // Load cart from local storage if needed
                const savedCart = localStorage.getItem('shopCart');
                if (savedCart) {
                    this.cart = JSON.parse(savedCart);
                    this.updateCartUI();
                }
                this.initAddressAutocomplete();
                this.initStreetAutocomplete();
                this.renderCategories();
                
                // Setze Standardland beim Start
                this.setCountry(this.selectedCountry);
            },

            getCurrency() {
                return config.currencyRates[this.selectedCountry] || config.currencyRates['default'];
            },

            formatPrice(amount) {
                const currency = this.getCurrency();
                const converted = amount * currency.rate;
                return `${converted.toFixed(2)} ${currency.symbol}`;
            },

            initAddressAutocomplete() {
                const zipInput = document.getElementById('input-zip');
                const cityInput = document.getElementById('input-city');
                const countrySelect = document.getElementById('input-country');
                
                if (!zipInput || !cityInput) return;

                zipInput.addEventListener('input', (e) => {
                    const zip = e.target.value;
                    const countryCode = countrySelect ? (countrySelect.value.toLowerCase() || 'de') : 'de';
                    
                    if (zip.length >= 4 && /^\d+$/.test(zip)) {
                        cityInput.placeholder = "Suche Stadt...";
                        // Dynamische API-Abfrage basierend auf Land
                        fetch(`https://api.zippopotam.us/${countryCode}/${zip}`)
                            .then(response => {
                                if (!response.ok) throw new Error('PLZ nicht gefunden');
                                return response.json();
                            })
                            .then(data => {
                                if (data.places && data.places.length > 0) {
                                    cityInput.value = data.places[0]['place name'];
                                    this.showToast(`Stadt gefunden: ${cityInput.value} 📍`);
                                }
                            })
                            .catch(() => { /* Silent fail, user types manually */ })
                            .finally(() => { cityInput.placeholder = "Stadt"; });
                    }
                });
            },

            initStreetAutocomplete() {
                const streetInput = document.getElementById('input-street');
                const suggestionsBox = document.getElementById('street-suggestions');
                const zipInput = document.getElementById('input-zip');
                const cityInput = document.getElementById('input-city');
                const countrySelect = document.getElementById('input-country');

                if (!streetInput || !suggestionsBox) return;

                let debounceTimer;

                streetInput.addEventListener('input', (e) => {
                    clearTimeout(debounceTimer);
                    const query = e.target.value;
                    
                    if (query.length < 3) {
                        suggestionsBox.classList.remove('active');
                        return;
                    }

                    debounceTimer = setTimeout(() => {
                        // Suche in DACH-Region (lang=de)
                        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=de`)
                            .then(res => res.json())
                            .then(data => {
                                suggestionsBox.innerHTML = '';
                                if (data.features && data.features.length > 0) {
                                    data.features.forEach(feature => {
                                        const props = feature.properties;
                                        // Nur anzeigen, wenn Straße vorhanden
                                        if (props.street || props.name) {
                                            const div = document.createElement('div');
                                            div.className = 'autocomplete-item';
                                            const streetName = props.street || props.name;
                                            const houseNr = props.housenumber || '';
                                            const city = props.city || props.town || props.village || '';
                                            const zip = props.postcode || '';
                                            const countryCode = props.countrycode ? props.countrycode.toUpperCase() : '';
                                            
                                            div.innerHTML = `<strong>${streetName} ${houseNr}</strong><small>${zip} ${city}</small>`;
                                            
                                            div.onclick = () => {
                                                streetInput.value = `${streetName} ${houseNr}`.trim();
                                                if (zip) zipInput.value = zip;
                                                if (city) cityInput.value = city;
                                                
                                                // Land automatisch setzen, falls erkannt und in der Liste vorhanden
                                                if (countryCode && countrySelect) {
                                                    const option = countrySelect.querySelector(`option[value="${countryCode}"]`);
                                                    if (option) {
                                                        countrySelect.value = countryCode;
                                                    }
                                                }
                                                
                                                suggestionsBox.classList.remove('active');
                                            };
                                            suggestionsBox.appendChild(div);
                                        }
                                    });
                                    suggestionsBox.classList.add('active');
                                } else {
                                    suggestionsBox.classList.remove('active');
                                }
                            })
                            .catch(err => console.error(err));
                    }, 300); // 300ms warten bevor Request gesendet wird
                });

                // Schließen wenn man woanders hinklickt
                document.addEventListener('click', (e) => {
                    if (e.target !== streetInput && e.target !== suggestionsBox) {
                        suggestionsBox.classList.remove('active');
                    }
                });
            },

            toggleMenu() {
                const nav = document.getElementById('main-nav');
                const hamburger = document.querySelector('.hamburger');
                nav.classList.toggle('active');
                hamburger.classList.toggle('active');
            },

            navigate(pageId) {
                // Hide all sections
                document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
                // Show target section
                document.getElementById(pageId).classList.add('active');

                // Update Nav State
                document.querySelectorAll('nav a').forEach(el => el.classList.remove('active'));
                const navLink = document.getElementById('nav-' + pageId);
                if (navLink) navLink.classList.add('active');

                // Close Mobile Menu
                document.getElementById('main-nav').classList.remove('active');
                const hamburger = document.querySelector('.hamburger');
                if(hamburger) hamburger.classList.remove('active');

                // Stop tracking interval when leaving page
                if (this.trackingInterval) clearInterval(this.trackingInterval);

                window.scrollTo(0, 0);
            },

            renderCategories() {
                const categories = ['Alle', 'Favoriten', ...new Set(products.map(p => p.category))];
                const container = document.getElementById('category-filters');
                container.innerHTML = categories.map(cat => 
                    `<button class="category-btn ${cat === 'Alle' ? 'active' : ''}" onclick="app.filterCategory('${cat}')">${cat}</button>`
                ).join('');
            },

            toggleFilterView() {
                const container = document.getElementById('category-filters');
                const btn = document.querySelector('.filter-toggle');
                container.classList.toggle('expanded');
                
                if (container.classList.contains('expanded')) {
                    btn.style.transform = 'rotate(180deg)';
                } else {
                    btn.style.transform = 'rotate(0deg)';
                }
            },

            filterCategory(category) {
                this.filterState.category = category;
                this.applyFilters();
            },

            searchProducts(query) {
                this.filterState.search = query;
                this.applyFilters();
            },

            sortProducts(sortValue) {
                this.filterState.sort = sortValue;
                this.applyFilters();
            },

            applyFilters() {
                let list = [...products]; // Kopie erstellen

                // 1. Kategorie Filter
                if (this.filterState.category === 'Favoriten') {
                    list = list.filter(p => this.favorites.includes(p.id));
                } else if (this.filterState.category !== 'Alle') {
                    list = list.filter(p => p.category === this.filterState.category);
                }

                // 2. Suche Filter
                if (this.filterState.search) {
                    const term = this.filterState.search.toLowerCase();
                    list = list.filter(p => 
                        p.name.toLowerCase().includes(term) || 
                        p.description.toLowerCase().includes(term)
                    );
                }

                // 3. Sortierung
                if (this.filterState.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
                else if (this.filterState.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
                else if (this.filterState.sort === 'name-asc') list.sort((a, b) => a.name.localeCompare(b.name));

                this.updateFilterUI();
                this.renderProducts(list);
            },

            setCountry(country) {
                this.selectedCountry = country;
                
                // 1. Texte aktualisieren (Lokalisierung)
                const texts = config.locales[country] || config.locales['DE'];
                const heroTitle = document.getElementById('hero-title');
                const heroText = document.getElementById('hero-text');
                const cartTitle = document.getElementById('cart-section-title');
                
                if(heroTitle) heroTitle.innerText = texts.heroTitle;
                if(heroText) heroText.innerText = texts.heroText;
                if(cartTitle) cartTitle.innerText = texts.cartTitle;

                // 2. Alle Auswahlfelder synchronisieren
                const selects = ['header-country-select', 'cart-country', 'input-country'];
                selects.forEach(id => {
                    const el = document.getElementById(id);
                    if(el) el.value = country;
                });

                // 3. Preise und UI aktualisieren
                this.updateCartUI();
                this.renderProducts(); // Shop-Preise aktualisieren
            },

            updateFilterUI() {
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.innerText === this.filterState.category);
                });
            },

            renderProducts(list = products) {
                const container = document.getElementById('product-list');
                const featuredContainer = document.getElementById('featured-products');

                const createCard = (p, index, context) => {
                    const isFav = this.favorites.includes(p.id);
                    // Sale Logic
                    const isSale = p.originalPrice && p.originalPrice > p.price;
                    const savings = isSale ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
                    
                    return `
                <div class="product-card" style="animation-delay: ${index * 100}ms">
                    ${isSale ? `<div class="sale-badge">-${savings}%</div>` : ''}
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="app.toggleFavorite(${p.id})">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                    <div class="product-img" onclick="app.showProductDetails(${p.id})" style="cursor: pointer;">
                        <img src="${p.image}" alt="${p.name}">
                    </div>
                    <div class="product-details">
                        <h3 class="product-title" onclick="app.showProductDetails(${p.id})" style="cursor: pointer;">${p.name}</h3>
                        <p class="product-desc">${p.description}</p>
                        <div class="product-price">
                            ${isSale ? `<span class="old-price">${this.formatPrice(p.originalPrice)}</span>` : ''}
                            ${this.formatPrice(p.price)}
                        </div>
                        
                        <div style="margin-bottom: 1rem; display: flex; align-items: center;">
                            <label style="margin-right: 0.5rem; font-size: 0.9rem; color: #666;">Menge:</label>
                            <div style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                                <button onclick="app.adjustQty(${p.id}, '${context}', -1)" style="width: 30px; padding: 0.4rem 0; border-radius: 0; margin: 0; background: #f3f4f6; color: #333;">-</button>
                                <input type="number" id="qty-${p.id}-${context}" value="1" min="1" style="width: 40px; padding: 0.4rem 0; text-align: center; border: none; margin: 0; -moz-appearance: textfield; background: white;">
                                <button onclick="app.adjustQty(${p.id}, '${context}', 1)" style="width: 30px; padding: 0.4rem 0; border-radius: 0; margin: 0; background: #f3f4f6; color: #333;">+</button>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <button onclick="app.addToCart(${p.id}, '${context}')" style="padding: 0.75rem 0.2rem; font-size: 0.85rem;">In den Korb</button>
                            <button onclick="app.buyNow(${p.id}, '${context}')" class="secondary" style="padding: 0.75rem 0.2rem; font-size: 0.85rem;">Direkt</button>
                        </div>
                    </div>
                </div>
            `;
                };

                container.innerHTML = list.map((p, i) => createCard(p, i, 'list')).join('');
                // Just show first 2 as featured for demo
                featuredContainer.innerHTML = products.slice(0, 2).map((p, i) => createCard(p, i, 'feat')).join('');
            },

            showProductDetails(id) {
                const p = products.find(x => x.id === id);
                if(!p) return;
                
                this.currentProductId = id;
                
                document.getElementById('detail-img').src = p.image;
                document.getElementById('detail-category').innerText = p.category;
                document.getElementById('detail-title').innerText = p.name;
                
                const isSale = p.originalPrice && p.originalPrice > p.price;
                document.getElementById('detail-price').innerHTML = (isSale ? `<span class="old-price" style="font-size: 1.5rem;">${this.formatPrice(p.originalPrice)}</span> ` : '') + this.formatPrice(p.price);
                
                document.getElementById('detail-desc').innerText = p.description;
                
                // Fav Btn Logic
                const favBtn = document.getElementById('detail-fav-btn');
                const isFav = this.favorites.includes(id);
                favBtn.className = `fav-btn ${isFav ? 'active' : ''}`;
                favBtn.onclick = () => {
                    this.toggleFavorite(id);
                    const newFav = this.favorites.includes(id);
                    favBtn.className = `fav-btn ${newFav ? 'active' : ''}`;
                };
                
                // Controls
                const controls = document.querySelector('.detail-controls');
                controls.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <label style="font-weight: bold;">Menge:</label>
                        <div class="qty-selector" style="background: #f3f4f6; padding: 5px; border-radius: 12px;">
                            <button onclick="app.adjustDetailQty(-1)" style="width: 40px; height: 40px; font-size: 1.2rem;">-</button>
                            <input type="number" id="detail-qty-input" value="1" min="1" style="width: 50px; text-align: center; border: none; background: transparent; font-size: 1.2rem; font-weight: bold; margin: 0;">
                            <button onclick="app.adjustDetailQty(1)" style="width: 40px; height: 40px; font-size: 1.2rem;">+</button>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <button onclick="app.addToCartFromDetail()" class="checkout-btn-large">In den Warenkorb</button>
                        <button onclick="app.buyNowFromDetail()" class="checkout-btn-large secondary">Direkt kaufen</button>
                    </div>
                `;
                
                this.navigate('product-detail');
            },

            toggleFavorite(id) {
                const index = this.favorites.indexOf(id);
                if (index === -1) {
                    this.favorites.push(id);
                    this.showToast("Zu Favoriten hinzugefügt ❤️");
                } else {
                    this.favorites.splice(index, 1);
                    this.showToast("Aus Favoriten entfernt 💔");
                }
                localStorage.setItem('shopFavorites', JSON.stringify(this.favorites));
                this.applyFilters(); // Re-render to update icons
            },

            adjustQty(id, context, delta) {
                const input = document.getElementById(`qty-${id}-${context}`);
                if (input) {
                    let val = parseInt(input.value) + delta;
                    if (val < 1) val = 1;
                    input.value = val;
                }
            },

            adjustDetailQty(delta) {
                const input = document.getElementById('detail-qty-input');
                if(input) {
                    let val = parseInt(input.value) + delta;
                    if(val < 1) val = 1;
                    input.value = val;
                }
            },

            addToCartFromDetail() {
                const qty = parseInt(document.getElementById('detail-qty-input').value) || 1;
                this.addToCart(this.currentProductId, null, qty);
            },

            buyNowFromDetail() {
                this.addToCartFromDetail();
                this.checkout();
            },

            addToCart(id, context = 'list', explicitQty = null) {
                const product = products.find(p => p.id === id);
                const existing = this.cart.find(item => item.id === id);

                let qty = explicitQty;
                if (qty === null) {
                    const qtyInput = document.getElementById(`qty-${id}-${context}`);
                    qty = qtyInput ? parseInt(qtyInput.value) : 1;
                }
                if (isNaN(qty) || qty < 1) qty = 1;

                if (existing) {
                    existing.qty += qty;
                } else {
                    this.cart.push({ ...product, qty: qty });
                }

                this.saveCart();
                this.updateCartUI();
                this.showToast(`${qty}x ${product.name} in den Warenkorb gelegt! 🍬`);

                // Cart Icon Animation
                const cartIcon = document.querySelector('.cart-icon');
                cartIcon.classList.remove('cart-bump');
                void cartIcon.offsetWidth; // Trigger reflow
                cartIcon.classList.add('cart-bump');
            },

            buyNow(id, context = 'list') {
                this.addToCart(id, context);
                this.checkout();
            },

            updateCartQty(id, delta) {
                const item = this.cart.find(i => i.id === id);
                if (item) {
                    item.qty += delta;
                    if (item.qty < 1) item.qty = 1;
                    this.saveCart();
                    this.updateCartUI();
                }
            },

            removeFromCart(id) {
                this.cart = this.cart.filter(item => item.id !== id);
                this.saveCart();
                this.updateCartUI();
            },

            applyDiscount() {
                const input = document.getElementById('discount-code');
                const code = input.value.trim().toUpperCase();
                
                if (discountCodes[code]) {
                    this.discount = { code: code, ...discountCodes[code] };
                    this.showToast(`Gutschein ${code} angewendet! 🎉`);
                    input.value = '';
                    this.updateCartUI();
                } else {
                    this.showToast("Ungültiger Gutscheincode", "error");
                    this.discount = null;
                }
            },

            updateCartUI() {
                const cartItemsContainer = document.getElementById('cart-items-container');
                const cartSummaryContainer = document.getElementById('cart-summary-container');
                const countBadge = document.getElementById('cart-count');
                const subtotalEl = document.getElementById('cart-subtotal');
                const totalEl = document.getElementById('cart-total-display');
                const shippingEl = document.getElementById('cart-shipping');
                const discountRow = document.getElementById('cart-discount-row');
                const discountAmountEl = document.getElementById('cart-discount-amount');
                const taxEl = document.getElementById('cart-tax');
                const countrySelect = document.getElementById('cart-country');

                // Update Count
                const totalQty = this.cart.reduce((sum, item) => sum + item.qty, 0);
                countBadge.innerText = totalQty;
                countBadge.style.display = totalQty > 0 ? 'block' : 'none';

                // Empty State
                if (this.cart.length === 0) {
                    // Vorschläge generieren (erste 3 Produkte)
                    const suggestions = products.slice(0, 3).map(p => `
                        <div class="product-card" style="border: 1px solid #eee; box-shadow: none; animation: none; opacity: 1;">
                            <div class="product-img" style="height: 150px;" onclick="app.showProductDetails(${p.id})">
                                <img src="${p.image}" alt="${p.name}">
                            </div>
                            <div class="product-details" style="padding: 1rem;">
                                <h4 style="margin: 0 0 0.5rem; font-size: 1rem;">${p.name}</h4>
                                <div style="color: var(--primary-color); font-weight: bold; margin-bottom: 0.5rem;">${this.formatPrice(p.price)}</div>
                                <button onclick="app.addToCart(${p.id})" style="font-size: 0.8rem; padding: 0.5rem;">Hinzufügen</button>
                            </div>
                        </div>
                    `).join('');

                    cartItemsContainer.innerHTML = `
                        <div class="cart-empty-state">
                            <div class="cart-empty-icon">🛒</div>
                            <h3>Dein Warenkorb ist leer</h3>
                            <p style="color: #666; margin-bottom: 1.5rem;">Sieht aus, als hättest du noch keine Leckereien gefunden.</p>
                            <button onclick="app.navigate('shop')">Jetzt stöbern</button>
                        </div>
                        <div class="cart-suggestions">
                            <h3 style="color: #666; font-size: 1.2rem; margin-bottom: 1.5rem;">Das könnte dir schmecken:</h3>
                            <div class="product-grid" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem;">
                                ${suggestions}
                            </div>
                        </div>
                    `;
                    if(cartSummaryContainer) cartSummaryContainer.style.display = 'none';
                    cartItemsContainer.style.gridColumn = '1 / -1';
                    return;
                }

                if(cartSummaryContainer) cartSummaryContainer.style.display = 'block';
                cartItemsContainer.style.gridColumn = 'auto';

                let total = 0;
                cartItemsContainer.innerHTML = this.cart.map(item => {
                    const itemTotal = item.price * item.qty;
                    total += itemTotal;
                    return `
                    <div class="cart-item">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 12px;">
                            <div>
                                <strong style="font-size: 1.1rem;">${item.name}</strong><br>
                                <small style="color: #666;">${this.formatPrice(item.price)} / Stück</small>
                            </div>
                        </div>
                        <div class="cart-controls">
                            <div class="qty-selector">
                                <button onclick="app.updateCartQty(${item.id}, -1)">-</button>
                                <span>${item.qty}</span>
                                <button onclick="app.updateCartQty(${item.id}, 1)">+</button>
                            </div>
                            <div class="item-total">
                                <span>${this.formatPrice(itemTotal)}</span>
                            </div>
                            <button class="remove-btn" onclick="app.removeFromCart(${item.id})" title="Entfernen">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
                }).join('');

                // Update Cart Summary with Shipping
                if (countrySelect) countrySelect.value = this.selectedCountry;
                const shipping = getShippingCost(this.selectedCountry);
                
                // Discount Calculation
                this.cartTotalBeforeDiscount = total; // Für Steuerberechnung speichern
                let discountVal = 0;
                if (this.discount) {
                    if (this.discount.type === 'percent') {
                        discountVal = total * this.discount.value;
                    } else {
                        discountVal = this.discount.value;
                    }
                    if (discountVal > total) discountVal = total; // Nicht negativ werden
                }
                this.discountAmount = discountVal;

                const totalAfterDiscount = total - discountVal;
                const totalGross = totalAfterDiscount + shipping;
                
                // Steuerberechnung mit globaler Funktion
                let discountRatio = 0;
                if (this.discount && this.cartTotalBeforeDiscount > 0) {
                    discountRatio = this.discountAmount / this.cartTotalBeforeDiscount;
                }
                const taxAmount = calculateTax(this.selectedCountry, this.cart, shipping, discountRatio);

                if (discountRow) discountRow.style.display = discountVal > 0 ? 'flex' : 'none';
                if (discountAmountEl) discountAmountEl.innerText = `-${this.formatPrice(discountVal)}`;

                if(shippingEl) shippingEl.innerText = `${this.formatPrice(shipping)}`;
                if(taxEl) taxEl.innerText = `${this.formatPrice(taxAmount)}`;
                if(subtotalEl) subtotalEl.innerText = `${this.formatPrice(total)}`;
                if(totalEl) totalEl.innerText = `${this.formatPrice(totalGross)}`;
            },

            saveCart() {
                localStorage.setItem('shopCart', JSON.stringify(this.cart));
            },

            // --- WIZARD LOGIC ---
            checkout() {
                if (this.cart.length === 0) {
                    this.showToast("Dein Warenkorb ist leer!", "error");
                    return;
                }
                this.currentStep = 1;
                
                // Sync country to wizard
                const wizardCountry = document.getElementById('input-country');
                if(wizardCountry) wizardCountry.value = this.selectedCountry;

                this.updateWizardUI();
                this.navigate('checkout');
            },

            updateWizardUI() {
                // Steps visibility
                document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
                document.getElementById(`step-${this.currentStep}`).classList.add('active');

                // Progress Bar
                document.getElementById('wizard-progress-bar').style.width = (this.currentStep / 3 * 100) + '%';

                // Buttons
                const backBtn = document.getElementById('btn-back');
                const nextBtn = document.getElementById('btn-next');
                
                backBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
                
                if (this.currentStep === 3) {
                    nextBtn.innerHTML = 'Kostenpflichtig bestellen ✨';
                    this.renderCheckoutSummary();
                } else {
                    nextBtn.innerHTML = 'Weiter ➔';
                }
            },

            nextStep() {
                if (this.currentStep === 1) {
                    // Validate Step 1
                    const form = document.getElementById('checkout-form-step1');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                }

                if (this.currentStep < 3) {
                    this.currentStep++;
                    this.updateWizardUI();
                } else {
                    this.placeOrder();
                }
            },

            prevStep() {
                if (this.currentStep > 1) {
                    this.currentStep--;
                    this.updateWizardUI();
                }
            },

            selectPayment(label) {
                document.querySelectorAll('.payment-card').forEach(el => el.classList.remove('selected'));
                label.classList.add('selected');
                label.querySelector('input').checked = true;
            },

            renderCheckoutSummary() {
                const summary = document.getElementById('checkout-summary-wizard');
                const totalEl = document.getElementById('checkout-total-wizard');
                const countrySelect = document.getElementById('input-country');
                
                let total = 0;
                let subtotal = 0;
                
                // 1. Zuerst Zwischensumme berechnen (FIX für Preis-Bug)
                let itemsHtml = this.cart.map(item => {
                    const sum = item.price * item.qty;
                    subtotal += sum;
                    return `<div style="display:flex; justify-content:space-between; margin-bottom:0.8rem; color:#555; font-size: 1.1rem; border-bottom: 1px dashed #ddd; padding-bottom: 0.5rem;">
                        <span><strong>${item.qty}x</strong> ${item.name}</span>
                        <span><strong>${this.formatPrice(sum)}</strong></span>
                    </div>`;
                }).join('');

                // Versandkosten berechnen
                const country = countrySelect ? countrySelect.value : 'DE';
                const shipping = getShippingCost(country);
                const shippingLabel = `Versand (${country})`;
                
                // Discount Logic for Wizard
                let discountVal = 0;
                if (this.discount) {
                    if (this.discount.type === 'percent') {
                        discountVal = subtotal * this.discount.value;
                    } else {
                        discountVal = this.discount.value;
                    }
                    if (discountVal > subtotal) discountVal = subtotal;
                }
                const totalAfterDiscount = subtotal - discountVal;
                const totalGross = totalAfterDiscount + shipping;

                // Steuer neu berechnen (mit Kontext aus Cart-Update)
                this.cartTotalBeforeDiscount = subtotal;
                this.discountAmount = discountVal;
                
                let discountRatio = 0;
                if (this.discount && this.cartTotalBeforeDiscount > 0) {
                    discountRatio = this.discountAmount / this.cartTotalBeforeDiscount;
                }
                const taxAmount = calculateTax(country, this.cart, shipping, discountRatio);

                summary.innerHTML = itemsHtml + `
                    <div style="display:flex; justify-content:space-between; margin-top:1rem; padding-top:0.5rem; color:#444; font-weight:500;">
                        <span>Zwischensumme</span>
                        <span>${this.formatPrice(subtotal)}</span>
                    </div>
                    ${discountVal > 0 ? `
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:var(--accent-color); font-weight:bold;">
                        <span>Rabatt (${this.discount.code})</span>
                        <span>-${this.formatPrice(discountVal)}</span>
                    </div>` : ''}
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#444; font-weight:500;">
                        <span>${shippingLabel}</span>
                        <span>${this.formatPrice(shipping)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#666; font-size: 0.9rem;">
                        <span>Enth. MwSt.</span>
                        <span>${this.formatPrice(taxAmount)}</span>
                    </div>
                `;

                totalEl.innerText = `Gesamt: ${this.formatPrice(totalGross)}`;
            },

            placeOrder() {
                const btn = document.getElementById('btn-next');
                const originalText = btn.innerText;
                
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner"></span> Verarbeite...';
                
                // Simuliere API Request
                setTimeout(() => {
                    const orderId = 'ORD-' + Date.now().toString().slice(-6);
                    this.lastOrderId = orderId;
                    document.getElementById('order-id').innerText = orderId;

                    // Bestelldaten für Rechnung sichern (bevor Cart geleert wird)
                    const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
                    const shipping = getShippingCost(this.selectedCountry);
                    let discountVal = 0;
                    if (this.discount) {
                        discountVal = this.discount.type === 'percent' ? subtotal * this.discount.value : this.discount.value;
                        if (discountVal > subtotal) discountVal = subtotal;
                    }
                    
                    this.lastOrder = {
                        id: orderId,
                        date: new Date().toLocaleDateString('de-DE'),
                        items: [...this.cart],
                        subtotal: subtotal,
                        shipping: shipping,
                        discountVal: discountVal,
                        total: subtotal - discountVal + shipping
                    };
                    
                    this.cart = [];
                    this.saveCart();
                    this.updateCartUI();
                    
                    runConfetti(); // Trigger Confetti
                    
                    this.navigate('success');
                    
                    document.getElementById('checkout-form-step1').reset();
                    btn.disabled = false;
                    btn.innerText = originalText;
                }, 2000);
            },

            downloadInvoice() {
                if (!this.lastOrder) {
                    this.showToast("Keine Rechnungsdaten verfügbar.", "error");
                    return;
                }

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const o = this.lastOrder;
                
                // Logo Image Element (aus dem DOM)
                const logoImg = document.querySelector('.logo img');

                // Farben definieren
                const primaryColor = [74, 4, 78]; // #4a044e
                const accentColor = [219, 39, 119]; // #db2777

                // --- Header ---
                // Hintergrundbalken
                doc.setFillColor(...primaryColor);
                doc.rect(0, 0, 210, 40, 'F');

                // Logo einfügen (falls geladen)
                if (logoImg && logoImg.complete && logoImg.naturalHeight !== 0) {
                    try {
                        doc.addImage(logoImg, 'JPEG', 15, 5, 30, 30);
                    } catch (e) {
                        console.warn("Logo konnte nicht ins PDF eingefügt werden:", e);
                    }
                }

                // Titel
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.setTextColor(255, 255, 255);
                doc.text("RECHNUNG", 150, 28);

                // --- Info Sektion ---
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");

                let y = 60;
                
                // Links: Firmenadresse
                doc.setFont("helvetica", "bold");
                doc.text("Candyocean GmbH", 15, y); y += 5;
                doc.setFont("helvetica", "normal");
                doc.text("Zuckerstraße 1", 15, y); y += 5;
                doc.text("12345 Süßstadt", 15, y); y += 5;
                doc.text("Deutschland", 15, y); y += 5;
                doc.text("info@candyocean.de", 15, y);

                // Rechts: Bestelldaten
                y = 60;
                const rightColX = 130;
                doc.text("Bestellnummer:", rightColX, y); 
                doc.text(o.id, rightColX + 35, y); y += 6;
                
                doc.text("Datum:", rightColX, y); 
                doc.text(o.date, rightColX + 35, y); y += 6;
                
                // --- Artikel Tabelle ---
                y = 95;
                
                // Tabellenkopf
                doc.setFillColor(240, 240, 240);
                doc.rect(15, y - 8, 180, 10, 'F');
                doc.setFont("helvetica", "bold");
                doc.text("Artikel", 20, 45);
                doc.text("Preis", 160, 45);
                doc.text("Artikel", 20, y);
                doc.text("Menge", 110, y);
                doc.text("Einzelpreis", 135, y);
                doc.text("Gesamt", 170, y);
                
                y += 10;
                doc.setFont("helvetica", "normal");

                o.items.forEach((item, i) => {
                    const itemTotal = item.price * item.qty;
                    
                    // Zebra-Streifen
                    if (i % 2 === 1) {
                        doc.setFillColor(250, 250, 250);
                        doc.rect(15, y - 6, 180, 8, 'F');
                    }

                    doc.text(item.name, 20, y);
                    doc.text(String(item.qty), 115, y);
                    doc.text(this.formatPrice(item.price), 135, y);
                    doc.text(this.formatPrice(itemTotal), 170, y);
                    
                    y += 8;
                });

                // Trennlinie
                doc.setDrawColor(200, 200, 200);
                doc.line(20, y, 190, y);
                y += 10;

                // --- Summen ---
                const totalsX = 130;
                const valuesX = 170;

                doc.text("Zwischensumme:", totalsX, y);
                doc.text(this.formatPrice(o.subtotal), valuesX, y);
                y += 6;

                if (o.discountVal > 0) {
                    doc.setTextColor(...accentColor);
                    doc.text("Rabatt:", totalsX, y);
                    doc.text(`-${this.formatPrice(o.discountVal)}`, valuesX, y);
                    doc.setTextColor(0, 0, 0);
                    y += 6;
                }

                doc.text("Versand:", totalsX, y);
                doc.text(this.formatPrice(o.shipping), valuesX, y);
                y += 10;

                // Gesamtbetrag Box
                doc.setFillColor(...primaryColor);
                doc.rect(totalsX - 5, y - 7, 70, 12, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.text("Gesamtbetrag:", totalsX, y);
                doc.text(this.formatPrice(o.total), valuesX, y);

                // --- Footer ---
                doc.setTextColor(128, 128, 128);
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                const pageHeight = doc.internal.pageSize.height;
                doc.text("Vielen Dank für deinen Einkauf!", 105, pageHeight - 20, { align: "center" });
                doc.text("Candyocean GmbH - www.candyocean.de", 105, pageHeight - 15, { align: "center" });

                doc.save(`Rechnung_${o.id}.pdf`);
            },

            trackOrder() {
                if (!this.lastOrderId) {
                    this.showToast("Keine aktuelle Bestellung gefunden.", "error");
                    return;
                }

                if (this.trackingInterval) clearInterval(this.trackingInterval);
                
                document.getElementById('tracking-order-id').innerText = this.lastOrderId;
                this.navigate('tracking');

                // Simuliere Fortschritt
                const timeline = document.querySelector('.tracking-timeline');
                const steps = [
                    { title: "Bestellung eingegangen", desc: "Wir haben deine Bestellung erhalten.", icon: "✅" },
                    { title: "Wird verpackt", desc: "Deine Süßigkeiten werden liebevoll zusammengestellt.", icon: "📦" },
                    { title: "Versandt", desc: "Das Paket ist auf dem Weg zu dir.", icon: "🚚" },
                    { title: "In Zustellung", desc: "Gleich klingelt es an der Tür!", icon: "🏠" }
                ];

                let currentStepIndex = 0;

                const renderTimeline = () => {
                    timeline.innerHTML = steps.map((step, index) => {
                        const isActive = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        return `
                        <div class="timeline-item ${isActive ? 'active' : ''} ${isCurrent ? 'pulse' : ''}">
                            <div class="timeline-icon">${step.icon}</div>
                            <div class="timeline-content">
                                <strong>${step.title}</strong>
                                <small>${step.desc}</small>
                            </div>
                        </div>`;
                    }).join('');
                };

                renderTimeline();

                // Automatisches Update alle 3 Sekunden
                this.trackingInterval = setInterval(() => {
                    currentStepIndex++;
                    if (currentStepIndex >= steps.length) {
                        clearInterval(this.trackingInterval);
                        this.showToast("Deine Bestellung ist angekommen! 📦", "success");
                        runConfetti();
                    }
                    renderTimeline();
                }, 3000);
            },

            showToast(message, type = 'success') {
                const container = document.getElementById('toast-container');
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                toast.innerHTML = `
                    <span style="display: flex; align-items: center;">
                        ${type === 'error' 
                            ? '<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" style="color: #ef4444"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>' 
                            : '<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 24 24" style="color: #10b981"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'}
                    </span>
                    <span>${message}</span>
                `;

                container.appendChild(toast);

                setTimeout(() => {
                    toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            }
        };

        // --- CONFETTI LOGIC ---
        function runConfetti() {
            const canvas = document.getElementById('confetti-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            const particles = [];
            const colors = ['#db2777', '#4a044e', '#fbbf24', '#3b82f6', '#10b981'];
            
            for(let i=0; i<200; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height - canvas.height,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 8 + 4,
                    speed: Math.random() * 5 + 2,
                    angle: Math.random() * 6.2
                });
            }
            
            function animate() {
                ctx.clearRect(0,0,canvas.width, canvas.height);
                let active = false;
                particles.forEach(p => {
                    p.y += p.speed;
                    p.x += Math.sin(p.angle) * 2;
                    p.angle += 0.1;
                    if(p.y < canvas.height) active = true;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                    ctx.fill();
                });
                if(active) requestAnimationFrame(animate);
                else ctx.clearRect(0,0,canvas.width, canvas.height);
            }
            animate();
        }

        // Start App
        window.onload = () => app.init();