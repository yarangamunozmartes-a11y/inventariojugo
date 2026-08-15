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

function normalizarLista(respuesta, claves = []) {
    if (Array.isArray(respuesta)) return respuesta;
    if (!respuesta || typeof respuesta !== 'object') return [];

    const alternativas = [...claves, 'data', 'items', 'resultado', 'resultados', 'records', 'rows'];
    for (const clave of alternativas) {
        if (Array.isArray(respuesta[clave])) return respuesta[clave];
    }

    for (const clave of Object.keys(respuesta)) {
        if (Array.isArray(respuesta[clave])) return respuesta[clave];
    }

    return [];
}

function sumarCampo(lista, campo) {
    return lista.reduce((total, item) => {
        const valor = Number(item[campo] ?? item[campo.replace(/_/g, '')] ?? item[campo.replace(/_/g, ' ')] ?? 0);
        return total + (isNaN(valor) ? 0 : valor);
    }, 0);
}

async function probarConexion() {
    try {
        const respuesta = await llamarAPI('ping');
        const mensaje = respuesta && respuesta.success ? '✅ Conexión correcta con Apps Script.' : '⚠️ La API respondió, pero no se detectó éxito.';
        mostrarMensaje('compraResultado', mensaje, respuesta && respuesta.success ? 'success' : 'error');
    } catch (e) {
        mostrarMensaje('compraResultado', '❌ ' + e.message, 'error');
    }
}

async function agregarMaterialReceta() {
    const select = document.getElementById('recetaMaterialSelect');
    const inputCantidad = document.getElementById('recetaCantidad');
    if (!select || !inputCantidad) return;

    const materialId = select.value;
    const cantidad = parseFloat(inputCantidad.value);
    if (!materialId || isNaN(cantidad) || cantidad <= 0) {
        mostrarMensaje('recetaResultado', 'Seleccione un material y una cantidad válida', 'error');
        return;
    }

    const material = window.materialesCache && window.materialesCache[materialId]
        ? window.materialesCache[materialId]
        : { id: materialId, nombre: select.options[select.selectedIndex]?.textContent || 'Material' };

    window.recetaMateriales = window.recetaMateriales || [];
    const idx = window.recetaMateriales.findIndex(item => String(item.id) === String(materialId));
    if (idx >= 0) {
        window.recetaMateriales[idx].cantidad = Number(window.recetaMateriales[idx].cantidad) + cantidad;
    } else {
        window.recetaMateriales.push({ id: material.id, nombre: material.nombre, cantidad });
    }

    inputCantidad.value = '';
    select.selectedIndex = 0;
    actualizarListaMaterialesReceta();
}

function actualizarListaMaterialesReceta() {
    const lista = document.getElementById('recetaMaterialesList');
    if (!lista) return;

    window.recetaMateriales = window.recetaMateriales || [];
    if (!window.recetaMateriales.length) {
        lista.innerHTML = '<li>No hay materiales agregados.</li>';
        return;
    }

    const html = window.recetaMateriales.map(item => {
        const nombre = item.nombre || 'Material';
        return `<li>${nombre}: ${Number(item.cantidad).toFixed(2)}</li>`;
    }).join('');

    lista.innerHTML = html;
}

function mostrarFormNuevoMaterial() {
    const form = document.getElementById('formNuevoMaterial');
    if (!form) return;
    form.classList.toggle('hidden');
}

async function crearNuevoMaterial() {
    const nombre = document.getElementById('nuevoMatNombre').value.trim();
    const categoria = document.getElementById('nuevoMatCategoria').value.trim();
    const presentacion = document.getElementById('nuevoMatPresentacion').value;
    const costo = parseFloat(document.getElementById('nuevoMatCosto').value);

    if (!nombre || isNaN(costo) || costo < 0) {
        mostrarMensaje('recetaResultado', 'Complete nombre y costo válido del material', 'error');
        return;
    }

    try {
        const respuesta = await llamarAPI('crearMaterial', {
            material: {
                nombre,
                categoria,
                presentacion,
                costoUnitario: costo,
                costo_unitario: costo
            }
        });

        if (respuesta && respuesta.success) {
            mostrarMensaje('recetaResultado', '✅ Material creado correctamente', 'success');
            document.getElementById('nuevoMatNombre').value = '';
            document.getElementById('nuevoMatCategoria').value = '';
            document.getElementById('nuevoMatPresentacion').selectedIndex = 0;
            document.getElementById('nuevoMatCosto').value = '';
            document.getElementById('formNuevoMaterial').classList.add('hidden');
            await cargarMateriales();
        } else {
            mostrarMensaje('recetaResultado', '❌ No se pudo guardar el material', 'error');
        }
    } catch (e) {
        mostrarMensaje('recetaResultado', '❌ ' + e.message, 'error');
    }
}

async function cargarDetalleReceta() {
    const sel = document.getElementById('recetasExistentes');
    const detalle = document.getElementById('detalleReceta');
    if (!sel || !detalle) return;

    const recetaId = sel.value;
    if (!recetaId) {
        detalle.innerHTML = '';
        return;
    }

    try {
        const recetas = await llamarAPI('obtenerRecetas');
        const lista = normalizarLista(recetas, ['recetas']);
        const receta = lista.find(r => String(r.id) === String(recetaId) || String(r.receta_id) === String(recetaId));

        if (!receta) {
            detalle.innerHTML = '<p>Receta no encontrada.</p>';
            return;
        }

        const nombre = receta.producto_nombre || receta.nombre || 'Receta';
        const precioVenta = parseFloat(receta.precio_venta ?? receta.precioVenta ?? 0);
        const detalles = normalizarLista(receta.detalles || receta.materiales || receta.ingredientes, ['detalles', 'materiales', 'ingredientes']);

        let html = `<h4>${nombre}</h4><p><strong>Precio:</strong> S/${precioVenta.toFixed(2)}</p>`;
        if (!detalles.length) {
            html += '<p>No hay materiales registrados.</p>';
        } else {
            html += '<ul>' + detalles.map(item => {
                const materialNombre = item.material_nombre || item.nombre || item.material || 'Material';
                const cantidad = Number(item.cantidad ?? item.cant ?? 0);
                return `<li>${materialNombre}: ${cantidad.toFixed(2)}</li>`;
            }).join('') + '</ul>';
        }
        detalle.innerHTML = html;
    } catch (e) {
        console.error('Error al cargar detalle de receta:', e);
        detalle.innerHTML = '<p>Error al cargar la receta.</p>';
    }
}

async function cargarRecetasExistentes() {
    try {
        const recetas = await llamarAPI('obtenerRecetas');
        const sel = document.getElementById('recetasExistentes');
        if (!sel) return;

        sel.innerHTML = '<option value="">Seleccione...</option>';
        const lista = normalizarLista(recetas, ['recetas']);
        lista.forEach(r => {
            const nombre = r.producto_nombre || r.nombre || 'Producto';
            const precio = parseFloat(r.precio_venta ?? r.precioVenta ?? r.precio ?? 0);
            const opt = document.createElement('option');
            opt.value = r.id ?? r.receta_id ?? '';
            opt.textContent = `${nombre} (S/${precio.toFixed(2)})`;
            sel.appendChild(opt);
        });
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

        const lista = normalizarLista(inventario, ['inventario']);
        if (!lista.length) {
            contenedor.innerHTML = '<p>No hay inventario.</p>';
            return;
        }

        let html = '<table><tr><th>Material</th><th>Stock actual</th><th>Stock inicial</th><th>Entradas</th><th>Salidas</th></tr>';
        lista.forEach(i => {
            const stock = parseInt(i.stock_actual ?? i.stockActual ?? 0, 10);
            const stockClass = stock < 5 ? 'badge danger' : (stock < 20 ? 'badge warning' : 'badge');
            html += `<tr><td>${i.nombre || i.material_nombre || 'Material'}</td><td><span class="${stockClass}">${stock}</span></td><td>${i.stock_inicial ?? i.stockInicial ?? 0}</td><td>${i.entradas || 0}</td><td>${i.salidas || 0}</td></tr>`;
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

        const registros = normalizarLista(ventas, ['ventas']);
        if (!registros.length) {
            lista.innerHTML = '<p>No hay ventas.</p>';
            return;
        }

        const ultimas = registros.slice(-10).reverse();
        let html = '<table><tr><th>Fecha</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Ganancia</th></tr>';
        ultimas.forEach(v => {
            const nombre = v.producto_nombre || v.producto || v.nombre || 'Venta';
            const total = parseFloat(v.total_venta ?? v.totalVenta ?? v.total ?? 0);
            const ganancia = parseFloat(v.ganancia ?? v.gananciaVenta ?? 0);
            html += `<tr><td>${v.fecha || v.created_at || ''}</td><td>${nombre}</td><td>${v.cantidad || 0}</td><td>S/${total.toFixed(2)}</td><td>S/${ganancia.toFixed(2)}</td></tr>`;
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
        const lista = normalizarLista(recetas, ['recetas']);
        lista.forEach(r => {
            const nombre = r.producto_nombre || r.nombre || 'Producto';
            const precio = parseFloat(r.precio_venta ?? r.precioVenta ?? r.precio ?? 0);
            const opt = document.createElement('option');
            opt.value = r.id ?? r.receta_id ?? '';
            opt.dataset.precio = String(precio);
            opt.textContent = `${nombre} (S/${precio.toFixed(2)})`;
            sel.appendChild(opt);
        });

        sel.onchange = function() {
            const precio = parseFloat(this.selectedOptions[0]?.dataset?.precio || this.value || 0);
            const input = document.getElementById('ventaPrecioUnitario');
            if (input && !isNaN(precio) && precio > 0) {
                input.value = precio.toFixed(2);
            }
        };
    } catch (e) {
        console.error('Error al cargar opciones de venta:', e);
    }
}

async function cargarHistorial() {
    const fechaDesde = document.getElementById('histFechaDesde')?.value || '';
    const fechaHasta = document.getElementById('histFechaHasta')?.value || '';
    const resumen = document.getElementById('resumenEstadisticas');
    const histCompras = document.getElementById('histCompras');
    const histVentas = document.getElementById('histVentas');

    if (!resumen || !histCompras || !histVentas) return;

    try {
        const [ventasResp, comprasResp] = await Promise.all([
            llamarAPI('obtenerVentas').catch(() => []),
            llamarAPI('obtenerCompras').catch(() => [])
        ]);

        const ventas = normalizarLista(ventasResp, ['ventas']);
        const compras = normalizarLista(comprasResp, ['compras']);

        const filtrarFechas = (list) => list.filter(item => {
            const fecha = item.fecha || item.created_at || item.fecha_compra || '';
            if (!fecha) return true;
            if (fechaDesde && fecha < fechaDesde) return false;
            if (fechaHasta && fecha > fechaHasta) return false;
            return true;
        });

        const ventasFiltradas = filtrarFechas(ventas);
        const comprasFiltradas = filtrarFechas(compras);

        const totalVentas = sumarCampo(ventasFiltradas, 'total_venta');
        const totalCompras = sumarCampo(comprasFiltradas, 'precio_total');
        const utilidad = totalVentas - totalCompras;

        resumen.innerHTML = `
            <h3>Resumen</h3>
            <p><strong>Ventas:</strong> S/${totalVentas.toFixed(2)}</p>
            <p><strong>Compras:</strong> S/${totalCompras.toFixed(2)}</p>
            <p><strong>Utilidad:</strong> S/${utilidad.toFixed(2)}</p>
        `;

        const renderTabla = (titulo, datos, columnas) => {
            if (!datos.length) {
                return `<h4>${titulo}</h4><p>No hay registros</p>`;
            }

            const elegirValor = (item, claves) => {
                for (const clave of claves) {
                    if (item?.[clave] !== undefined && item?.[clave] !== null && item?.[clave] !== '') {
                        return item[clave];
                    }
                }
                return '';
            };

            const cabecera = columnas.map(col => `<th>${col}</th>`).join('');
            const filas = datos.slice(-10).reverse().map(item => {
                const cols = columnas.map(col => {
                    const tituloCol = col.toLowerCase();
                    let valor = '';

                    if (tituloCol.includes('fecha')) {
                        valor = elegirValor(item, ['fecha', 'created_at', 'fecha_compra', 'date']);
                    } else if (tituloCol.includes('producto')) {
                        valor = elegirValor(item, ['producto_nombre', 'producto', 'nombre', 'material_nombre']);
                    } else if (tituloCol.includes('total')) {
                        valor = elegirValor(item, ['total_venta', 'totalVenta', 'precio_total', 'precioTotal', 'total', 'monto']);
                        if (valor !== '' && !isNaN(Number(valor))) {
                            valor = `S/${Number(valor).toFixed(2)}`;
                        }
                    } else {
                        valor = elegirValor(item, [col.toLowerCase().replace(/\s+/g, '_'), col.toLowerCase().replace(/\s+/g, '')]);
                    }

                    return `<td>${valor}</td>`;
                }).join('');
                return `<tr>${cols}</tr>`;
            }).join('');

            return `<h4>${titulo}</h4><table><thead><tr>${cabecera}</tr></thead><tbody>${filas}</tbody></table>`;
        };

        histCompras.innerHTML = renderTabla('Compras', comprasFiltradas, ['Fecha', 'Producto', 'Total']);
        histVentas.innerHTML = renderTabla('Ventas', ventasFiltradas, ['Fecha', 'Producto', 'Total']);
    } catch (e) {
        console.error('Error al cargar historial:', e);
        resumen.innerHTML = '<p>Error al cargar historial.</p>';
        histCompras.innerHTML = '<p>Error.</p>';
        histVentas.innerHTML = '<p>Error.</p>';
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
        if (tabId === 'tabHistorial') cargarHistorial();
    });
});

window.onload = function() {
    window.recetaMateriales = [];
    cargarMateriales();
    cargarComprasRecientes();
    cargarRecetasExistentes();
    cargarVentasRecetas();
    cargarVentasRecientes();
    cargarInventario();
    cargarHistorial();
};