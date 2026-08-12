// ============================================================
// CONFIGURACIÓN - URL DE TU WEB APP
// ============================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxngrInT2noMnXGjM7WP7u5aIPRt907_vXKFPWjWtqehCPT5XZZl8r8fZU5i-BC1w9G/exec';

// ============================================================
// FUNCIÓN PRINCIPAL PARA LLAMAR A LA API (Sincronizada con Apps Script)
// ============================================================
async function llamarAPI(accion, datos = {}) {
    try {
        const payload = { accion, ...datos };
        console.log('📤 Enviando:', payload);

        // Envío directo como texto sin encabezados complejos para evitar preflight CORS
        const respuesta = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        if (!respuesta.ok) {
            const textoError = await respuesta.text();
            console.error('❌ Error HTTP:', textoError);
            throw new Error(`Error ${respuesta.status}: ${textoError}`);
        }

        const texto = await respuesta.text();
        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch (parseError) {
            console.error('❌ Error al parsear JSON:', parseError, 'Texto recibido:', texto);
            throw new Error('Respuesta del servidor no válida.');
        }

        console.log('✅ Datos recibidos:', resultado);
        return resultado;
    } catch (error) {
        console.error('❌ Error en llamarAPI:', error);
        throw new Error('No se pudo conectar con el servidor. Revisa el despliegue en Apps Script.');
    }
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
function mostrarMensaje(id, texto, tipo = 'success') {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = texto;
    el.className = `mensaje ${tipo}`;
    el.classList.remove('hidden');
    if (window._timeoutMensaje) clearTimeout(window._timeoutMensaje);
    window._timeoutMensaje = setTimeout(() => el.classList.add('hidden'), 6000);
}

// ============================================================
// FUNCIONES PARA COMPRAS
// ============================================================
async function registrarCompra() {
    const nombre = document.getElementById('compraNombre').value.trim();
    const categoria = document.getElementById('compraCategoria').value.trim();
    const presentacion = document.getElementById('compraPresentacion').value;
    const cantidad = parseFloat(document.getElementById('compraCantidad').value);
    const unidad = document.getElementById('compraUnidad').value.trim();
    const precioTotal = parseFloat(document.getElementById('compraPrecioTotal').value);
    const proveedor = document.getElementById('compraProveedor').value.trim();
    const observaciones = document.getElementById('compraObservaciones').value.trim();

    if (!nombre || isNaN(cantidad) || isNaN(precioTotal)) {
        mostrarMensaje('compraResultado', 'Complete los campos obligatorios (*)', 'error');
        return;
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);

    // Se envían ambas claves (precioTotal y precio_total) para asegurar compatibilidad
    const compra = { 
        nombre, 
        categoria, 
        presentacion, 
        cantidad, 
        unidad, 
        precioTotal: precioTotal, 
        precio_total: precioTotal, 
        proveedor, 
        observaciones, 
        fecha, 
        hora 
    };

    try {
        const resultado = await llamarAPI('registrarCompra', { compra });
        if (resultado && resultado.success) {
            const costo = parseFloat(resultado.costoUnitario || 0).toFixed(2);
            mostrarMensaje('compraResultado', `✅ Compra registrada. Costo unitario: S/${costo}`, 'success');
            
            document.getElementById('compraNombre').value = '';
            document.getElementById('compraCategoria').value = '';
            document.getElementById('compraPresentacion').selectedIndex = 0;
            document.getElementById('compraCantidad').value = '';
            document.getElementById('compraUnidad').value = '';
            document.getElementById('compraPrecioTotal').value = '';
            document.getElementById('compraProveedor').value = '';
            document.getElementById('compraObservaciones').value = '';
            cargarComprasRecientes();
            cargarMateriales();
        } else {
            mostrarMensaje('compraResultado', '❌ Error al registrar la compra', 'error');
        }
    } catch (e) {
        mostrarMensaje('compraResultado', '❌ ' + e.message, 'error');
    }
}

async function cargarComprasRecientes() {
    try {
        const compras = await llamarAPI('obtenerCompras');
        const lista = document.getElementById('listaCompras');
        if (!lista) return;

        if (!Array.isArray(compras) || compras.length === 0) {
            lista.innerHTML = '<p>No hay compras.</p>';
            return;
        }

        const ultimas = compras.slice(-10).reverse();
        let html = '<table><tr><th>Fecha</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Unitario</th></tr>';
        ultimas.forEach(c => {
            const unitario = parseFloat(c.costo_unitario || 0).toFixed(2);
            html += `<tr><td>${c.fecha}</td><td>${c.material_nombre || c.nombre}</td><td>${c.cantidad}</td><td>S/${parseFloat(c.precio_total || 0).toFixed(2)}</td><td>S/${unitario}</td></tr>`;
        });
        html += '</table>';
        lista.innerHTML = html;
    } catch (e) {
        console.error('Error al cargar compras recientes:', e);
        const lista = document.getElementById('listaCompras');
        if (lista) lista.innerHTML = '<p>Error al cargar compras</p>';
    }
}

// ============================================================
// FUNCIONES PARA MATERIALES Y RECETAS
// ============================================================
async function cargarMateriales() {
    try {
        const materiales = await llamarAPI('obtenerMateriales');
        const contenedor = document.getElementById('tablaMateriales');
        const select = document.getElementById('recetaMaterialSelect');
        if (select) {
            select.innerHTML = '<option value="">Seleccione...</option>';
        }

        if (!contenedor) return;
        if (!Array.isArray(materiales) || materiales.length === 0) {
            contenedor.innerHTML = '<p>No hay materiales.</p>';
            return;
        }

        window.materialesCache = {};
        let html = '<table><tr><th>Material</th><th>Categoría</th><th>Presentación</th><th>Costo unitario</th></tr>';
        materiales.forEach(m => {
            const id = m.id ?? m.material_id;
            const nombre = m.nombre || m.material_nombre || 'N/A';
            const categoria = m.categoria || '-';
            const presentacion = m.presentacion || '-';
            const costo = parseFloat(m.costo_unitario || 0).toFixed(2);
            html += `<tr><td>${nombre}</td><td>${categoria}</td><td>${presentacion}</td><td>S/${costo}</td></tr>`;

            if (id && select) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = `${nombre} (S/${costo})`;
                select.appendChild(opt);
            }

            if (id) {
                window.materialesCache[id] = { id, nombre, categoria, presentacion, costo };
            }
        });
        html += '</table>';
        contenedor.innerHTML = html;
    } catch (e) {
        console.error('Error al cargar materiales:', e);
        const contenedor = document.getElementById('tablaMateriales');
        if (contenedor) contenedor.innerHTML = '<p>Error al cargar materiales</p>';
    }
}

async function guardarReceta() {
    const nombre = document.getElementById('recetaNombre').value.trim();
    const precioVenta = parseFloat(document.getElementById('recetaPrecio').value);
    const materiales = window.recetaMateriales || [];

    if (!nombre || isNaN(precioVenta) || precioVenta <= 0 || materiales.length === 0) {
        mostrarMensaje('recetaResultado', 'Complete nombre, precio y materiales', 'error');
        return;
    }

    const detalles = materiales.map(d => ({ materialId: parseInt(d.id, 10), cantidad: d.cantidad }));
    const receta = { nombre, precioVenta, detalles };

    try {
        const resultado = await llamarAPI('crearReceta', { receta });
        if (resultado && resultado.success) {
            mostrarMensaje('recetaResultado', '✅ Receta guardada con éxito', 'success');
            document.getElementById('recetaNombre').value = '';
            document.getElementById('recetaPrecio').value = '';
            window.recetaMateriales = [];
            actualizarListaMaterialesReceta();
            cargarRecetasExistentes();
            cargarVentasRecetas();
        } else {
            mostrarMensaje('recetaResultado', '❌ No se pudo guardar la receta', 'error');
        }
    } catch (e) {
        mostrarMensaje('recetaResultado', '❌ ' + e.message, 'error');
    }
}

async function cargarRecetasExistentes() {
    try {
        const recetas = await llamarAPI('obtenerRecetas');
        const sel = document.getElementById('recetasExistentes');
        if (!sel) return;

        sel.innerHTML = '<option value="">Seleccione...</option>';
        if (Array.isArray(recetas)) {
            recetas.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = `${r.producto_nombre} (S/${parseFloat(r.precio_venta || 0).toFixed(2)})`;
                sel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error al cargar recetas:', e);
    }
}

// ============================================================
// VENTAS E INVENTARIO
// ============================================================
async function registrarVenta() {
    const recetaId = parseInt(document.getElementById('ventaRecetaSelect').value, 10);
    const cantidad = parseInt(document.getElementById('ventaCantidad').value, 10);
    const precioUnitario = parseFloat(document.getElementById('ventaPrecioUnitario').value);

    if (isNaN(recetaId) || isNaN(cantidad) || cantidad <= 0 || isNaN(precioUnitario) || precioUnitario <= 0) {
        mostrarMensaje('ventaResultado', 'Complete todos los campos correctamente', 'error');
        return;
    }

    try {
        const resultado = await llamarAPI('registrarVenta', { venta: { recetaId, cantidad, precioUnitario } });
        if (resultado && resultado.success) {
            const total = parseFloat(resultado.totalVenta || 0).toFixed(2);
            const ganancia = parseFloat(resultado.ganancia || 0).toFixed(2);
            mostrarMensaje('ventaResultado', `✅ Venta registrada. Total: S/${total}, Ganancia: S/${ganancia}`, 'success');
            document.getElementById('ventaCantidad').value = 1;
            document.getElementById('ventaPrecioUnitario').value = '';
            cargarVentasRecientes();
            cargarInventario();
        } else {
            mostrarMensaje('ventaResultado', '❌ Error al registrar venta', 'error');
        }
    } catch (e) {
        mostrarMensaje('ventaResultado', '❌ ' + e.message, 'error');
    }
}

async function cargarInventario() {
    try {
        const inventario = await llamarAPI('obtenerInventario');
        const contenedor = document.getElementById('tablaInventario');
        if (!contenedor) return;

        if (!Array.isArray(inventario) || inventario.length === 0) {
            contenedor.innerHTML = '<p>No hay inventario.</p>';
            return;
        }

        let html = '<table><tr><th>Material</th><th>Stock actual</th><th>Stock inicial</th><th>Entradas</th><th>Salidas</th></tr>';
        inventario.forEach(i => {
            const stock = parseInt(i.stock_actual || 0, 10);
            const stockClass = stock < 5 ? 'badge danger' : (stock < 20 ? 'badge warning' : 'badge');
            html += `<tr><td>${i.nombre}</td><td><span class="${stockClass}">${stock}</span></td><td>${i.stock_inicial || 0}</td><td>${i.entradas || 0}</td><td>${i.salidas || 0}</td></tr>`;
        });
        html += '</table>';
        contenedor.innerHTML = html;
    } catch (e) {
        console.error('Error al cargar inventario:', e);
    }
}

async function cargarVentasRecientes() {
    try {
        const ventas = await llamarAPI('obtenerVentas');
        const lista = document.getElementById('listaVentas');
        if (!lista) return;

        if (!Array.isArray(ventas) || ventas.length === 0) {
            lista.innerHTML = '<p>No hay ventas.</p>';
            return;
        }

        const ultimas = ventas.slice(-10).reverse();
        let html = '<table><tr><th>Fecha</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Ganancia</th></tr>';
        ultimas.forEach(v => {
            html += `<tr><td>${v.fecha}</td><td>${v.producto_nombre}</td><td>${v.cantidad}</td><td>S/${parseFloat(v.total_venta || 0).toFixed(2)}</td><td>S/${parseFloat(v.ganancia || 0).toFixed(2)}</td></tr>`;
        });
        html += '</table>';
        lista.innerHTML = html;
    } catch (e) {
        console.error('Error al cargar ventas:', e);
    }
}

async function cargarVentasRecetas() {
    try {
        const recetas = await llamarAPI('obtenerRecetas');
        const sel = document.getElementById('ventaRecetaSelect');
        if (!sel) return;

        sel.innerHTML = '<option value="">Seleccione...</option>';
        if (Array.isArray(recetas)) {
            recetas.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = `${r.producto_nombre} (S/${parseFloat(r.precio_venta || 0).toFixed(2)})`;
                sel.appendChild(opt);
            });
        }
    } catch (e) {
        console.error('Error al cargar opciones de venta:', e);
    }
}

// NAVEGACIÓN E INICIALIZACIÓN
document.querySelectorAll('.nav-tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.nav-tabs button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const tabActual = document.getElementById(tabId);
        if (tabActual) tabActual.classList.add('active');

        if (tabId === 'tabMateriales') cargarMateriales();
        if (tabId === 'tabInventario') cargarInventario();
        if (tabId === 'tabVentas') { cargarVentasRecetas(); cargarVentasRecientes(); }
        if (tabId === 'tabRecetas') { cargarMateriales(); cargarRecetasExistentes(); }
        if (tabId === 'tabCompras') cargarComprasRecientes();
    });
});

window.onload = function() {
    cargarMateriales();
    cargarComprasRecientes();
    cargarRecetasExistentes();
    cargarVentasRecetas();
    cargarVentasRecientes();
    cargarInventario();
};