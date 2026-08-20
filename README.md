# 🏪 MercaSmart Web — Sistema POS & Administración

Versión web moderna, responsiva y **Mobile First** del sistema **MercaSmart**, migrada desde la aplicación de escritorio WPF a **React + Vite + TypeScript + Tailwind CSS + Supabase**.

---

## 🚀 Cómo Iniciar la Aplicación en VS Code

1. Abre la carpeta `C:\PULPERIA` en **Visual Studio Code**.
2. Abre la terminal integrada (`Ctrl + \`` o `Terminal > New Terminal`).
3. Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

4. Abre tu navegador en la URL indicada (usualmente `http://localhost:5173`).

---

## 🗄️ Configuración de la Base de Datos (Supabase)

El script SQL completo ya está generado en:
`C:\PULPERIA\supabase_schema.sql`

### Pasos:
1. Ve a tu panel de Supabase: [https://supabase.com/dashboard/project/dyfwcubkvgcqufpmtgvh](https://supabase.com/dashboard/project/dyfwcubkvgcqufpmtgvh)
2. Entra al **SQL Editor** en el menú lateral izquierdo.
3. Copia todo el contenido del archivo `supabase_schema.sql`.
4. Pégalo en el editor y presiona **RUN**.

Esto creará automáticamente:
* ✅ Todas las tablas (`profiles`, `products`, `categories`, `brands`, `suppliers`, `customers`, `sales`, `sale_items`, `cash_sessions`, `cash_movements`, `inventory_transactions`, `configuration`, `branches`).
* ✅ Lógica de impuestos hondureños (**ISV 0%, 15%, 18%**).
* ✅ Función transaccional atómica `complete_sale` para evitar descuadres de inventario o cajas.
* ✅ Función de arqueo y cierre de caja `close_cash_session`.
* ✅ Función de cancelación de ventas y devolución de stock `cancel_sale`.
* ✅ Función de ajuste y kardex de inventario `adjust_inventory`.
* ✅ Numeración correlativa fiscal **SAR** (formato `000-001-01-XXXXXXXX`).
* ✅ Seguridad RLS (Row Level Security) y permisos por rol.
* ✅ Cliente predeterminado **Consumidor Final** y datos semilla.

---

## 👥 Crear el Primer Usuario Administrador

En Supabase Auth, los usuarios inician sesión con su nombre de usuario en MercaSmart (internamente se asocia al correo `usuario@mercasmart.local`).

Para crear el primer **Administrador**:
1. En Supabase Dashboard ve a **Authentication > Users**.
2. Haz clic en **Add User > Create User**.
3. Ingresa:
   - **Email:** `admin@mercasmart.local`
   - **Password:** Tu contraseña deseada (ej. `admin123456`)
   - **Auto Confirm User:** Marcado (Yes).
4. Luego, en la tabla `public.profiles`, edita la fila creada asignándole el rol `Admin`.
5. ¡Listo! Ya puedes ingresar desde la pantalla de login con usuario `admin` y tu contraseña.
6. A partir de ese momento, como Administrador podrás crear nuevos cajeros y empleados directamente desde la sección **Usuarios** de la aplicación web.

---

## 📱 Características y Módulos Incluidos

- 📊 **Dashboard Dinámico por Rol:**
  - **Admin:** Métricas de ventas del día/mes, gráficos de ventas de 7 días, alertas de productos agotados y últimas facturas.
  - **Cajero:** Panel enfocado únicamente en su turno activo, ventas realizadas, efectivo en caja y acceso directo al POS.
  - **Empleado:** Alertas de stock bajo e inventario.
- 🛒 **Punto de Venta (POS):**
  - Búsqueda en tiempo real por nombre, código interno o escáner de código de barras.
  - Gestión rápida de carrito (cantidades, descuentos, eliminar).
  - Cálculo exacto de **ISV 15% y 18% incluido** con fórmula fiscal hondureña.
  - Métodos de pago: **Efectivo** (con cálculo de cambio), **Tarjeta**, **Transferencia**, **Crédito**.
  - Impresión y vista previa de ticket fiscal.
  - Obligatoriedad de tener un turno de caja abierto antes de cobrar.
- 💵 **Control de Caja Individual:**
  - Turnos independientes por cajero.
  - Registro de aperturas, ingresos y egresos extraordinarios.
  - Arqueo y cálculo automático de sobrantes o faltantes al cierre.
- 📦 **Catálogo de Productos & Kardex:**
  - CRUD con precios de costo, venta, márgenes de ganancia y stock mínimo.
  - Movimientos de inventario: Entradas, Salidas, Ventas, Ajustes y Devoluciones.
- 🏷️ **Categorías, Marcas & Proveedores:**
  - Gestión de promotores, teléfonos y RTN de distribuidores.
- 👥 **Clientes & Historial de Créditos:**
  - Control de saldos deudores y compras previas.
- 📄 **Historial de Facturación SAR:**
  - Anulación de facturas con reversión atómica de existencias.
- 📈 **Reportes & Estadísticas:**
  - Gráficos interactivos de ventas por fecha, productos más vendidos y análisis de ingresos.
- ⚙️ **Configuración SAR:**
  - Configuración de CAI, rangos de facturación y encabezados/pies de ticket.
- 🌙 **Modo Oscuro & PWA:**
  - Soporte para tema claro y oscuro con persistencia.
  - Configuración Progressive Web App (PWA) lista para instalar en Android, iOS o Escritorio.
