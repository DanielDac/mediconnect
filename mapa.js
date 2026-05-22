// ===== MediConnect – mapa.js =====

// Variables globales para el mapa de donación
let donarMap;
let donarMarker;
let geocoder;

/**
 * Inicializa el mapa en la vista de donación (donar.html).
 * Se restringe la vista a Guatemala.
 */
function initDonarMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  // Centro aproximado de Guatemala
  const guatemalaCenter = { lat: 15.783471, lng: -90.230759 };

  donarMap = new google.maps.Map(mapContainer, {
    zoom: 7,
    center: guatemalaCenter,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    restriction: {
      latLngBounds: {
        north: 18.0,
        south: 13.5,
        west: -92.5,
        east: -88.0,
      },
      strictBounds: false,
    },
  });

  geocoder = new google.maps.Geocoder();

  // Escuchar clics en el mapa
  donarMap.addListener('click', (e) => {
    placeMarkerAndValidate(e.latLng, donarMap);
  });

  // Autocompletado de dirección
  const inputSearch = document.getElementById('addressSearch');
  if (inputSearch) {
    const autocomplete = new google.maps.places.Autocomplete(inputSearch, {
      componentRestrictions: { country: "gt" },
      fields: ["geometry", "name", "formatted_address", "types"],
      // Permitimos geocode para encontrar pueblos y ciudades si no hay dirección exacta
      types: ["geocode"],
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(13.5, -92.5),
        new google.maps.LatLng(18.0, -88.0)
      ),
      strictBounds: false
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;

      const loc = place.geometry.location;
      donarMap.setCenter(loc);

      // Zoom inteligente: Si es una calle o dirección, acercamos más.
      // Si es un pueblo o zona, dejamos una vista más amplia.
      const isPrecise = place.types.includes('street_address') ||
        place.types.includes('route') ||
        place.types.includes('premise') ||
        place.types.includes('sublocality');

      donarMap.setZoom(isPrecise ? 16 : 14);
      placeMarkerAndValidate(loc, donarMap);
    });
  }

  // Agregar botón de "Mi ubicación actual" como control nativo de Google Maps
  const mapDiv = document.getElementById('map');

  if (donarMap && mapDiv) {
    const controlDiv = document.createElement('div');
    const locationBtn = document.createElement('button');
    locationBtn.innerHTML = `
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1115 0z" />
      </svg>
      Mi ubicación
    `;
    locationBtn.style.cssText = `
      background: #fff;
      border: 2px solid #fff;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0,0,0,.3);
      cursor: pointer;
      margin: 10px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--gray-800);
    `;

    locationBtn.onclick = (e) => {
      e.preventDefault();
      const originalHTML = locationBtn.innerHTML;
      locationBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;border-top-color:var(--primary)"></span> Buscando...';
      locationBtn.disabled = true;

      if (navigator.geolocation) {
        // Usamos una configuración más relajada para evitar errores en navegadores de escritorio
        navigator.geolocation.getCurrentPosition((pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          donarMap.setCenter(loc);
          donarMap.setZoom(16);
          placeMarkerAndValidate(loc, donarMap);

          locationBtn.innerHTML = originalHTML;
          locationBtn.disabled = false;
        }, (err) => {
          console.error("Error de geolocalización:", err);
          showToast('No se pudo obtener tu ubicación. Intenta seleccionar en el mapa.', 'error');
          locationBtn.innerHTML = originalHTML;
          locationBtn.disabled = false;
        }, {
          enableHighAccuracy: false, // Menos restrictivo para escritorio
          timeout: 8000,
          maximumAge: 0
        });
      } else {
        showToast('Tu navegador no soporta geolocalización', 'error');
        locationBtn.innerHTML = originalHTML;
        locationBtn.disabled = false;
      }
    };

    controlDiv.appendChild(locationBtn);
    donarMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
  }
}

/**
 * Coloca el marcador y valida que esté dentro de Guatemala usando Geocoding.
 * @param {google.maps.LatLng|Object} latLng Coordenadas
 * @param {google.maps.Map} map Instancia del mapa
 * @param {boolean} silent Si es true, no muestra toasts de éxito (útil para edición)
 */
function placeMarkerAndValidate(latLng, map, silent = false) {
  // Geocodificación inversa para verificar el país
  geocoder.geocode({ location: latLng }, (results, status) => {
    if (status === 'OK') {
      if (results[0]) {
        // Verificar si es Guatemala
        const isGuatemala = results[0].address_components.some(
          (component) => component.types.includes('country') && (component.short_name === 'GT' || component.long_name.toLowerCase().includes('guatemala'))
        );

        if (!isGuatemala) {
          showToast('Mediconect solo está disponible en Guatemala', 'error');
          return;
        }

        // Si es válido, colocar el marcador
        if (donarMarker) {
          donarMarker.setPosition(latLng);
        } else {
          donarMarker = new google.maps.Marker({
            position: latLng,
            map: map,
            animation: google.maps.Animation.DROP,
          });
        }

        // Extraer departamento o municipio si es posible
        let ubicacionTexto = "Guatemala";
        const adminArea1 = results[0].address_components.find(c => c.types.includes('administrative_area_level_1'));
        const locality = results[0].address_components.find(c => c.types.includes('locality'));

        if (locality) {
          ubicacionTexto = locality.long_name;
        } else if (adminArea1) {
          ubicacionTexto = adminArea1.long_name;
        }

        // Guardar coordenadas y mostrar ubicación
        const latVal = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
        const lngVal = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

        document.getElementById('medLat').value = latVal;
        document.getElementById('medLng').value = lngVal;

        const ubicacionLabel = document.getElementById('ubicacionTexto');
        if (ubicacionLabel) ubicacionLabel.innerText = "Ubicación: " + ubicacionTexto;

        if (!silent) {
          showToast('Ubicación seleccionada correctamente', 'success');
        }

      } else {
        showToast('No se encontraron resultados para esta ubicación.', 'error');
      }
    } else {
      showToast('Error de geocodificación. Por favor, intenta de nuevo.', 'error');
    }
  });
}

// Variables para el mapa general
let generalMap;

/**
 * Inicializa el mapa general (mapa.html) con los pines de donaciones.
 */
function initGeneralMap() {
  const mapContainer = document.getElementById('map-general');
  if (!mapContainer) return;

  const guatemalaCenter = { lat: 15.783471, lng: -90.230759 };

  generalMap = new google.maps.Map(mapContainer, {
    zoom: 7,
    center: guatemalaCenter,
    mapTypeControl: false,
    streetViewControl: false,
    styles: [
      {
        featureType: "poi.medical",
        elementType: "labels.icon",
        stylers: [{ visibility: "on" }, { color: "#E11D48" }]
      }
    ]
  });

  loadDonationPins();
}

/**
 * Carga los pines desde Supabase y los dibuja en el mapa general.
 */
async function loadDonationPins() {
  const user = mediConnect.getUser();
  if (!user) return;

  let donations;
  try {
    donations = await mediConnect.getDonations({ estado: 'disponible' });
  } catch (e) {
    console.error("Error al cargar donaciones para el mapa:", e);
    return;
  }

  const infoWindow = new google.maps.InfoWindow();

  // Agrupar donaciones por coordenadas para evitar solapamiento
  const groups = {};
  donations.forEach(d => {
    if (d.lat && d.lng) {
      // Agrupar puntos en un radio de aproximadamente 25-30 metros (mismo terreno o vecino)
      const latGrid = Math.round(parseFloat(d.lat) * 4000) / 4000;
      const lngGrid = Math.round(parseFloat(d.lng) * 4000) / 4000;
      const key = `${latGrid.toFixed(5)},${lngGrid.toFixed(5)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    }
  });

  // Dibujar un marcador por cada ubicación única
  Object.entries(groups).forEach(([key, groupMeds]) => {
    const [baseLat, baseLng] = key.split(',').map(Number);
    let pinLat = baseLat;
    let pinLng = baseLng;

    // Tomamos la primera donación para decidir si ofuscamos (todas en el grupo tendrían el mismo donante_id)
    const firstMed = groupMeds[0];

    // Ofuscar si NO es validador/admin y NO es el propio donante (Privacidad)
    if (user.rol !== 'validador' && user.rol !== 'admin' && firstMed.donante_id !== user.id) {
      // Usamos el ID del donante como semilla para que todas sus donaciones en ese punto 
      // se muevan al mismo lugar ofuscado y sigan agrupadas.
      const seed = parseInt(firstMed.donante_id.substring(0, 8), 16) || 123;
      const offsetLat = ((seed % 100) / 100 - 0.5) * 0.015;
      const offsetLng = (((seed * 13) % 100) / 100 - 0.5) * 0.015;
      pinLat += offsetLat;
      pinLng += offsetLng;
    }

    const marker = new google.maps.Marker({
      position: { lat: pinLat, lng: pinLng },
      map: generalMap,
      title: groupMeds.length > 1 ? `${groupMeds.length} medicamentos aquí` : groupMeds[0].nombre,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: groupMeds.length > 1 ? 14 : 10, // Más grande si hay varios
        fillColor: '#E11D48',
        fillOpacity: 0.9,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
      },
      label: groupMeds.length > 1 ? {
        text: groupMeds.length.toString(),
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold'
      } : null
    });

    // Contenido del InfoWindow con lista de medicamentos
    const exactitud = (user.rol === 'admin' || user.rol === 'validador') ? '<br><small style="color:var(--danger)">Ubicación Exacta</small>' : '<br><small style="color:var(--gray-500)">Ubicación Aproximada</small>';

    let medsListHTML = groupMeds.map(d => `
      <div style="padding: 10px 0; border-bottom: 1px solid var(--gray-100); last-child { border-bottom: none; }">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
          <div>
            <h4 style="margin: 0; font-size: 14px; color: var(--gray-900);">${d.nombre}</h4>
            <p style="margin: 2px 0; font-size: 12px; color: var(--gray-600);">${d.cantidad} un. - ${d.tipo}</p>
          </div>
          <a href="detalle.html?id=${d.id}" style="background: var(--primary); color: white; text-decoration: none; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 11px;">Ver</a>
        </div>
      </div>
    `).join('');

    const contentString = `
      <div style="font-family: var(--font-main); min-width: 220px; max-height: 300px; overflow-y: auto; padding: 5px;">
        <div style="margin-bottom: 10px;">
          <h3 style="margin: 0; font-size: 15px; color: var(--primary);">Medicamentos en esta ubicación</h3>
          ${exactitud}
        </div>
        ${medsListHTML}
      </div>
    `;

    marker.addListener('click', () => {
      infoWindow.setContent(contentString);
      infoWindow.open(generalMap, marker);
    });
  });
}

// Global scope initialization callback for Google Maps API
window.initMap = function () {
  if (document.getElementById('map')) {
    initDonarMap();
  }
  if (document.getElementById('map-general')) {
    initGeneralMap();
  }
};
