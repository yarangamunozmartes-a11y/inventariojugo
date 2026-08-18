// ============================================
// CONFIGURACIÓN - ¡IMPORTANTE!
// ============================================

// 👇 REEMPLAZA CON LA URL DE TU WEB APP
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmrdckkOZCeMdakxrssWeuhzhCujFlIIbNZPCFQs8WZABOxfqCVwlVE-xbWNQCQzhb/exec';

// ============================================
// ESTADO GLOBAL
// ============================================

let productos = [];
let stats = {};
let isLoading = false;

// ============================================
// VERIFICAR CONEXIÓN
// ============================================

async function verificarConexion() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    statusDot.className = 'status-dot checking';
    statusText.textContent = 'Verificando conexión...';
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getStats`);
        if (response.ok) {
            statusDot.className = 'status-dot online';
            statusText.textContent = '✅ Conectado a Google Sheets';
        } else {
            throw new Error('Error de conexión');
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        statusDot.className = 'status-dot offline';
        statusText.textContent = '❌ Sin conexión a Google Sheets';
        mostrarError('No se pudo conectar con Google Sheets.');
    }
}

// ============================================
// CARGAR PRODUCTOS
// ============================================

async function cargarProductos() {
    if (isLoading) return;
    
    isLoading = true;
    const container = document.getElementById('productList');
    container.innerHTML = '<div class="loading"><p>Cargando productos...</p></div>';
    
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getProductos`);
        productos = await response.json();
        renderizarProductos(productos);
        await actualizarStats();
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <p>❌ Error al cargar los productos</p>
                <button class="btn btn-primary" onclick="cargarProductos()">🔄 Reintentar</button>
            </div>
        `;
        mostrarError('Error al cargar los productos');
    }
    
    isLoading = false;
}

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================

async function actualizarStats() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getStats`);
        stats = await response.json();
        document.getElementById('totalProductos').textContent = stats.totalProductos || 0;
        document.getElementById('totalIngresos').textContent = `S/. ${(stats.totalIngresos || 0).toFixed(2)}`;
        document.getElementById('totalVentas').textContent = stats.totalVentas || 0;
        document.getElementById('stockBajo').textContent = stats.stockBajo || 0;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// ============================================
// RENDERIZAR PRODUCTOS
// ============================================

function renderizarProductos(productosList) {
    const container = document.getElementById('productList');
    
    if (!productosList || productosList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>📭 No hay productos en el inventario</p>
                <p style="color: #666; font-size: 0.9em;">Haz clic en "Nueva Compra" para agregar tu primer producto</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = productosList.map(producto => {
        const stockClass = producto.stockActual === 0 ? 'agotado' : 
                          producto.stockActual <= 5 ? 'bajo' : 'disponible';
        const stockText = producto.stockActual === 0 ? 'Agotado' : 
                          producto.stockActual <= 5 ? '⚠️ Stock bajo' : '✅ Disponible';
        
        return `
            <div class="product-card">
                <h3>${producto.nombre.toUpperCase()}</h3>
                <div class="info-row">
                    <span class="label">📦 Stock:</span>
                    <span class="value">
                        ${producto.stockActual} unidades
                        <span class="stock-badge ${stockClass}">${stockText}</span>
                    </span>
                </div>
                ${producto.esPaquete ? `
                <div class="info-row">
                    <span class="label">🍊 Porciones disponibles:</span>
                    <span class="value">${producto.stockActual * producto.porcionesPorPaquete}</span>
                </div>
                <div class="info-row">
                    <span class="label">📦 Porciones/paquete:</span>
                    <span class="value">${producto.porcionesPorPaquete}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="label">💰 Precio compra:</span>
                    <span class="value">S/. ${producto.precioCompra.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="label">💰 Precio venta:</span>
                    <span class="value">S/. ${producto.precioVenta.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="label">📊 Vendidos:</span>
                    <span class="value">${producto.unidadesVendidas || 0} unidades</span>
                </div>
                <div class="btn-actions">
                    <button class="btn-ventas" onclick="verVentas('${producto.nombre}')">📊 Ver ventas</button>
                    <button class="btn-eliminar" onclick="eliminarProducto('${producto.nombre}')">🗑️ Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// FILTRAR PRODUCTOS
// ============================================

function filtrarProductos() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterStock = document.getElementById('filterStock').value;
    
    let filtrados = productos;
    
    if (searchTerm) {
        filtrados = filtrados.filter(p => p.nombre.includes(searchTerm));
    }
    
    if (filterStock === 'bajo') {
        filtrados = filtrados.filter(p => p.stockActual <= 5 && p.stockActual > 0);
    } else if (filterStock === 'agotado') {
        filtrados = filtrados.filter(p => p.stockActual === 0);
    } else if (filterStock === 'disponible') {
        filtrados = filtrados.filter(p => p.stockActual > 5);
    }
    
    renderizarProductos(filtrados);
}

// ============================================
// ABRIR MODAL
// ============================================

function abrirModal(tipo) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    let html = '';
    
    switch(tipo) {
        case 'compra':
            html = `
                <h2>📥 Registrar Nueva Compra</h2>
                <form id="formCompra">
                    <div class="form-group">
                        <label>Nombre del producto *</label>
                        <input type="text" id="nombreCompra" required placeholder="Ej: Papaya, Agua, etc.">
                    </div>
                    <div class="form-group">
                        <label>Precio de compra (S/.) *</label>
                        <input type="number" id="precioCompra" required step="0.01" min="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Precio de venta (S/.) *</label>
                        <input type="number" id="precioVenta" required step="0.01" min="0.01" placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label>Cantidad comprada *</label>
                        <input type="number" id="cantidadCompra" required min="1" placeholder="1">
                    </div>
                    <div class="form-group">
                        <label>¿Es un paquete con múltiples porciones?</label>
                        <select id="esPaquete" onchange="togglePorciones()">
                            <option value="false">No</option>
                            <option value="true">Sí</option>
                        </select>
                    </div>
                    <div class="form-group" id="porcionesGroup" style="display:none;">
                        <label>¿Cuántas porciones/ventas salen de este paquete?</label>
                        <input type="number" id="porcionesPorPaquete" min="1" value="1">
                    </div>
                    <div class="form-group">
                        <label>Fecha de compra</label>
                        <input type="date" id="fechaCompra">
                    </div>
                    <button type="submit" class="btn-submit">✅ Registrar Compra</button>
                </form>
            `;
            break;
            
        case 'venta':
            const productosSelect = productos.length > 0 ? 
                productos.map(p => `
                    <option value="${p.nombre}" data-espaquete="${p.esPaquete}" data-porciones="${p.porcionesPorPaquete}">
                        ${p.nombre.toUpperCase()} (Stock: ${p.stockActual} und)
                    </option>
                `).join('') :
                '<option value="">No hay productos disponibles</option>';
            
            html = `
                <h2>💰 Registrar Venta</h2>
                <form id="formVenta">
                    <div class="form-group">
                        <label>Producto *</label>
                        <select id="productoVenta" required>
                            <option value="">Seleccionar producto...</option>
                            ${productosSelect}
                        </select>
                    </div>
                    <div class="form-group" id="tipoVentaGroup" style="display:none;">
                        <label>Tipo de venta</label>
                        <select id="tipoVenta">
                            <option value="unidad">Por unidad</option>
                            <option value="porcion">Por porción</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cantidad *</label>
                        <input type="number" id="cantidadVenta" required min="1" placeholder="1">
                    </div>
                    <button type="submit" class="btn-submit">💰 Registrar Venta</button>
                </form>
            `;
            break;
            
        case 'stock':
            const productosStock = productos.length > 0 ?
                productos.map(p => `
                    <option value="${p.nombre}">
                        ${p.nombre.toUpperCase()} (Stock actual: ${p.stockActual} und)
                    </option>
                `).join('') :
                '<option value="">No hay productos disponibles</option>';
            
            html = `
                <h2>📦 Agregar Stock</h2>
                <form id="formStock">
                    <div class="form-group">
                        <label>Producto *</label>
                        <select id="productoStock" required>
                            <option value="">Seleccionar producto...</option>
                            ${productosStock}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cantidad a agregar *</label>
                        <input type="number" id="cantidadStock" required min="1" placeholder="1">
                    </div>
                    <button type="submit" class="btn-submit">✅ Agregar Stock</button>
                </form>
            `;
            break;
    }
    
    modalBody.innerHTML = html;
    modal.style.display = 'block';
    
    switch(tipo) {
        case 'compra':
            document.getElementById('formCompra').addEventListener('submit', registrarCompra);
            break;
        case 'venta':
            document.getElementById('formVenta').addEventListener('submit', registrarVenta);
            const productoSelect = document.getElementById('productoVenta');
            if (productoSelect) {
                productoSelect.addEventListener('change', verificarTipoVenta);
            }
            break;
        case 'stock':
            document.getElementById('formStock').addEventListener('submit', agregarStock);
            break;
    }
}

function cerrarModal() {
    document.getElementById('modal').style.display = 'none';
}

function togglePorciones() {
    const esPaquete = document.getElementById('esPaquete').value === 'true';
    document.getElementById('porcionesGroup').style.display = esPaquete ? 'block' : 'none';
}

function verificarTipoVenta() {
    const select = document.getElementById('productoVenta');
    const selected = select.options[select.selectedIndex];
    const esPaquete = selected.dataset.espaquete === 'true';
    document.getElementById('tipoVentaGroup').style.display = esPaquete ? 'block' : 'none';
}

// ============================================
// REGISTRAR COMPRA
// ============================================

async function registrarCompra(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Registrando...';
    
    const data = {
        action: 'registrarCompra',
        nombre: document.getElementById('nombreCompra').value,
        precioCompra: parseFloat(document.getElementById('precioCompra').value),
        precioVenta: parseFloat(document.getElementById('precioVenta').value),
        cantidad: parseInt(document.getElementById('cantidadCompra').value),
        esPaquete: document.getElementById('esPaquete').value === 'true',
        porcionesPorPaquete: parseInt(document.getElementById('porcionesPorPaquete').value) || 1,
        fechaCompra: document.getElementById('fechaCompra').value || new Date().toISOString().split('T')[0]
    };
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        mostrarExito('✅ Producto registrado exitosamente');
        cerrarModal();
        setTimeout(() => cargarProductos(), 1000);
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al registrar el producto');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Registrar Compra';
    }
}

// ============================================
// REGISTRAR VENTA
// ============================================

async function registrarVenta(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Registrando...';
    
    const productoSelect = document.getElementById('productoVenta');
    const producto = productoSelect.value;
    const cantidad = parseInt(document.getElementById('cantidadVenta').value);
    const tipoVenta = document.getElementById('tipoVenta')?.value || 'unidad';
    
    if (!producto) {
        mostrarError('Selecciona un producto');
        submitBtn.disabled = false;
        submitBtn.textContent = '💰 Registrar Venta';
        return;
    }
    
    const data = {
        action: 'registrarVenta',
        nombre: producto,
        cantidad: cantidad,
        tipoVenta: tipoVenta
    };
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        mostrarExito('✅ Venta registrada exitosamente');
        cerrarModal();
        setTimeout(() => cargarProductos(), 1000);
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al registrar la venta');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💰 Registrar Venta';
    }
}

// ============================================
// AGREGAR STOCK
// ============================================

async function agregarStock(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Agregando...';
    
    const data = {
        action: 'agregarStock',
        nombre: document.getElementById('productoStock').value,
        cantidad: parseInt(document.getElementById('cantidadStock').value)
    };
    
    if (!data.nombre) {
        mostrarError('Selecciona un producto');
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Agregar Stock';
        return;
    }
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        mostrarExito('✅ Stock agregado exitosamente');
        cerrarModal();
        setTimeout(() => cargarProductos(), 1000);
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al agregar stock');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '✅ Agregar Stock';
    }
}

// ============================================
// ELIMINAR PRODUCTO
// ============================================

async function eliminarProducto(nombre) {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;
    
    try {
        const data = { action: 'eliminarProducto', nombre: nombre };
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        mostrarExito(`✅ Producto "${nombre}" eliminado`);
        setTimeout(() => cargarProductos(), 500);
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al eliminar el producto');
    }
}

// ============================================
// VER VENTAS DE PRODUCTO
// ============================================

async function verVentas(nombre) {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getVentas`);
        const ventas = await response.json();
        const ventasProducto = ventas.filter(v => v.producto === nombre);
        
        if (ventasProducto.length === 0) {
            mostrarError('Este producto no tiene ventas registradas');
            return;
        }
        
        const modal = document.getElementById('reporteModal');
        const body = document.getElementById('reporteBody');
        
        let html = `
            <h2>📊 Ventas de ${nombre.toUpperCase()}</h2>
            <div style="background: #f0f4ff; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <p><strong>Total de ventas:</strong> ${ventasProducto.length}</p>
                <p><strong>Total ingresos:</strong> S/. ${ventasProducto.reduce((sum, v) => sum + v.total, 0).toFixed(2)}</p>
            </div>
            <div class="ventas-lista">
                ${ventasProducto.map((v, index) => `
                    <div class="reporte-item">
                        <p><strong>Venta #${index + 1}</strong> - ${new Date(v.fechaVenta).toLocaleString()}</p>
                        <p>${v.tipoVenta === 'porcion' ? '🍊 Porciones' : '📦 Unidades'}: ${v.cantidad} - S/. ${v.total.toFixed(2)}</p>
                    </div>
                `).join('')}
            </div>
        `;
        
        body.innerHTML = html;
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar las ventas');
    }
}

// ============================================
// MOSTRAR REPORTE
// ============================================

async function mostrarReporte() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getReporte`);
        const reporte = await response.json();
        
        const modal = document.getElementById('reporteModal');
        const body = document.getElementById('reporteBody');
        
        let html = `
            <h2>📊 Reporte General</h2>
            <div class="reporte-resumen">
                <p><strong>📦 Total productos:</strong> ${reporte.productos.length}</p>
                <p><strong>📊 Total ventas:</strong> ${reporte.totalVentas}</p>
                <p><strong>💰 Ingresos totales:</strong> S/. ${reporte.totalIngresos.toFixed(2)}</p>
            </div>
            
            <h3>🏆 Productos Más Vendidos</h3>
            ${reporte.productosMasVendidos.length > 0 ?
                reporte.productosMasVendidos.map((p, i) => `
                    <div class="reporte-item">
                        <h4>#${i+1} - ${p.nombre.toUpperCase()}</h4>
                        <p>📊 Vendidos: ${p.unidadesVendidas} unidades</p>
                        <p>💰 Ingresos: S/. ${p.ingresosTotales.toFixed(2)}</p>
                        <p>📦 Stock actual: ${p.stockActual}</p>
                    </div>
                `).join('') :
                '<p style="text-align:center; color:#666;">No hay ventas registradas</p>'
            }
            
            <h3 style="margin-top:30px;">📋 Todos los Productos</h3>
            ${reporte.productos.map(p => `
                <div class="reporte-item">
                    <h4>${p.nombre.toUpperCase()}</h4>
                    <p>💰 Precio: S/. ${p.precioVenta.toFixed(2)} | Stock: ${p.stockActual}</p>
                    <p>📊 Ventas: ${p.totalVentas} | Ingresos: S/. ${p.ingresosTotales.toFixed(2)}</p>
                </div>
            `).join('')}
        `;
        
        body.innerHTML = html;
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar el reporte');
    }
}

function cerrarReporte() {
    document.getElementById('reporteModal').style.display = 'none';
}

// ============================================
// UTILIDADES
// ============================================

function mostrarError(mensaje) {
    alert('❌ ' + mensaje);
}

function mostrarExito(mensaje) {
    alert('✅ ' + mensaje);
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    verificarConexion();
    cargarProductos();
    
    window.onclick = function(event) {
        if (event.target === document.getElementById('modal')) cerrarModal();
        if (event.target === document.getElementById('reporteModal')) cerrarReporte();
    };
});