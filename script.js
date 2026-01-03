        // --- KONFIGURATION & DATEN ---
        const config = {
            currency: '€',
            locale: 'de-DE'
        };

        // Hier Produkte bearbeiten/hinzufügen
        const products = [
            {
                id: 1,
                name: "Regenbogen Lollys",
                price: 4.99,
                description: "Handgemachte Lutscher in bunten Farben.",
                image: "https://i.ebayimg.com/images/g/oToAAOSww6NhWoaQ/s-l1200.jpg"
            },
            {
                id: 2,
                name: "Saure Apfelringe",
                price: 2.50,
                description: "Extra sauer und fruchtig im Geschmack.",
                image: "https://suessigkeiten-shop.com/cdn/shop/files/8447_a_43235_931ad9db-5436-4fb1-8585-dbe8fdad45b9.webp?v=1755186082&width=1445"
            },
            {
                id: 3,
                name: "Schoko-Trüffel Box",
                price: 12.90,
                description: "Feinste Pralinen, gefüllt mit Nougat.",
                image: "https://www.heimgourmet.com/media/schokotruffel-jpg_crop.jpeg/rh/schokotruffel.jpg"
            },
            {
                id: 4,
                name: "Gummibärchen Mix",
                price: 3.99,
                description: "Der Klassiker in allen Farben und Formen.",
                image: "https://www.grizly.de/fruchtgummi-mix-img-grizly~~mlsani~~mix-ovocneho-zele~~8595678428215_00-fd-3.webp"
            }
        ];

        // --- APP LOGIK ---
        const app = {
            cart: [],
            currentStep: 1,

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

                window.scrollTo(0, 0);
            },

            searchProducts(query) {
                const term = query.toLowerCase();
                const filtered = products.filter(p => 
                    p.name.toLowerCase().includes(term) || 
                    p.description.toLowerCase().includes(term)
                );
                this.renderProducts(filtered);
            },

            renderProducts(list = products) {
                const container = document.getElementById('product-list');
                const featuredContainer = document.getElementById('featured-products');

                const createCard = (p, index, context) => `
                <div class="product-card" style="animation-delay: ${index * 100}ms">
                    <div class="product-img">
                        <img src="${p.image}" alt="${p.name}">
                    </div>
                    <div class="product-details">
                        <h3 class="product-title">${p.name}</h3>
                        <p class="product-desc">${p.description}</p>
                        <div class="product-price">${p.price.toFixed(2)} ${config.currency}</div>
                        
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

                container.innerHTML = list.map((p, i) => createCard(p, i, 'list')).join('');
                // Just show first 2 as featured for demo
                featuredContainer.innerHTML = products.slice(0, 2).map((p, i) => createCard(p, i, 'feat')).join('');
            },

            adjustQty(id, context, delta) {
                const input = document.getElementById(`qty-${id}-${context}`);
                if (input) {
                    let val = parseInt(input.value) + delta;
                    if (val < 1) val = 1;
                    input.value = val;
                }
            },

            addToCart(id, context = 'list') {
                const product = products.find(p => p.id === id);
                const existing = this.cart.find(item => item.id === id);

                const qtyInput = document.getElementById(`qty-${id}-${context}`);
                let qty = qtyInput ? parseInt(qtyInput.value) : 1;
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

            updateCartUI() {
                const cartContainer = document.getElementById('cart-items');
                const countBadge = document.getElementById('cart-count');
                const totalEl = document.getElementById('cart-total');

                // Update Count
                const totalQty = this.cart.reduce((sum, item) => sum + item.qty, 0);
                countBadge.innerText = totalQty;
                countBadge.style.display = totalQty > 0 ? 'block' : 'none';

                // Render Items
                if (this.cart.length === 0) {
                    cartContainer.innerHTML = '<p>Dein Warenkorb ist leer.</p>';
                    totalEl.innerText = `Gesamt: 0.00 ${config.currency}`;
                    return;
                }

                let total = 0;
                cartContainer.innerHTML = this.cart.map(item => {
                    const itemTotal = item.price * item.qty;
                    total += itemTotal;
                    return `
                    <div class="cart-item">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                            <div>
                                <strong>${item.name}</strong><br>
                                <small>${item.price.toFixed(2)} ${config.currency}</small>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="display: flex; align-items: center; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                                <button onclick="app.updateCartQty(${item.id}, -1)" style="width: 25px; padding: 0.2rem 0; border-radius: 0; margin: 0; background: #f3f4f6; color: #333; font-size: 0.9rem;">-</button>
                                <span style="width: 30px; text-align: center; font-size: 0.9rem; background: white; display: inline-block; line-height: 1.5;">${item.qty}</span>
                                <button onclick="app.updateCartQty(${item.id}, 1)" style="width: 25px; padding: 0.2rem 0; border-radius: 0; margin: 0; background: #f3f4f6; color: #333; font-size: 0.9rem;">+</button>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px; margin-left: auto;">
                                <span style="font-weight: bold;">${itemTotal.toFixed(2)} ${config.currency}</span>
                                <button class="danger" onclick="app.removeFromCart(${item.id})" style="padding: 0.5rem; display: flex; align-items: center; justify-content: center;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                }).join('');

                totalEl.innerText = `Gesamt: ${total.toFixed(2)} ${config.currency}`;
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
                
                // Versandkosten berechnen
                const country = countrySelect ? countrySelect.value : 'DE';
                let shipping = 0;
                let shippingLabel = "Versand";

                if (country === 'DE') { shipping = 4.99; shippingLabel = "Versand (DE)"; }
                else if (country === 'AT') { shipping = 9.99; shippingLabel = "Versand (AT)"; }
                else if (country === 'CH') { shipping = 14.99; shippingLabel = "Versand (CH)"; }
                else { shipping = 19.99; shippingLabel = "Versand (International)"; }

                let itemsHtml = this.cart.map(item => {
                    const sum = item.price * item.qty;
                    subtotal += sum;
                    return `<div style="display:flex; justify-content:space-between; margin-bottom:0.8rem; color:#555; font-size: 1.1rem; border-bottom: 1px dashed #ddd; padding-bottom: 0.5rem;">
                        <span><strong>${item.qty}x</strong> ${item.name}</span>
                        <span><strong>${sum.toFixed(2)} ${config.currency}</strong></span>
                    </div>`;
                }).join('');
                
                total = subtotal + shipping;

                summary.innerHTML = itemsHtml + `
                    <div style="display:flex; justify-content:space-between; margin-top:1rem; padding-top:0.5rem; color:#444; font-weight:500;">
                        <span>Zwischensumme</span>
                        <span>${subtotal.toFixed(2)} ${config.currency}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#444; font-weight:500;">
                        <span>${shippingLabel}</span>
                        <span>${shipping.toFixed(2)} ${config.currency}</span>
                    </div>
                `;

                totalEl.innerText = `Gesamt: ${total.toFixed(2)} ${config.currency}`;
            },

            placeOrder() {
                const btn = document.getElementById('btn-next');
                const originalText = btn.innerText;
                
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner"></span> Verarbeite...';
                
                // Simuliere API Request
                setTimeout(() => {
                    const orderId = 'ORD-' + Date.now().toString().slice(-6);
                    document.getElementById('order-id').innerText = orderId;
                    
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