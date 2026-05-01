from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

# Try GEE
try:
    import ee
    HAS_GEE = True
except ImportError:
    HAS_GEE = False


# ===============================
# DATA STRUCTURES
# ===============================
@dataclass
class ProviderResult:
    values: dict[str, Any]
    sources: dict[str, dict[str, Any]]
    warnings: list[str]


# ===============================
# MAIN CLASS
# ===============================
class FeatureProviders:
    def __init__(self):
        self._gee_initialized = False

    async def collect_all(self, lat, lon, start_date, end_date, crop_type):

        if not HAS_GEE:
            raise RuntimeError("Install earthengine-api")

        satellite = await self._fetch_satellite_indices_gee(
            lat, lon, start_date, end_date
        )

        return ProviderResult(
            values={**satellite.values, "crop_type": crop_type},
            sources=satellite.sources,
            warnings=satellite.warnings
        )

    # ==========================================
    # GEE FEATURE EXTRACTION
    # ==========================================
    async def _fetch_satellite_indices_gee(self, lat, lon, start_date, end_date):

        self._init_gee()

        point = ee.Geometry.Point([lon, lat])
        start = start_date.isoformat()
        end = (end_date + timedelta(days=1)).isoformat()

        # ===============================
        # SENTINEL-2
        # ===============================
        s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
              .filterBounds(point)
              .filterDate(start, end)
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))

        def add_indices(img):
            ndvi = img.normalizedDifference(['B8','B4']).rename('NDVI')
            ndwi = img.normalizedDifference(['B3','B8']).rename('NDWI')
            gndvi = img.normalizedDifference(['B8','B3']).rename('GNDVI')

            savi = img.expression(
                '((NIR - RED) / (NIR + RED + 0.5)) * 1.5',
                {'NIR': img.select('B8'), 'RED': img.select('B4')}
            ).rename('SAVI')

            evi = img.expression(
                '2.5*((NIR-RED)/(NIR+6*RED-7.5*BLUE+1))',
                {
                    'NIR': img.select('B8'),
                    'RED': img.select('B4'),
                    'BLUE': img.select('B2')
                }
            ).rename('EVI')

            return img.addBands([ndvi, ndwi, gndvi, savi, evi])

        s2 = s2.map(add_indices)

        # ===============================
        # INDICES
        # ===============================
        ndvi = s2.select('NDVI')

        ndvi_mean = ndvi.mean()
        ndvi_max = ndvi.max()
        ndvi_std = ndvi.reduce(ee.Reducer.stdDev())

        ndwi_mean = s2.select('NDWI').mean()
        gndvi_mean = s2.select('GNDVI').mean()
        savi_mean = s2.select('SAVI').mean()
        evi_mean = s2.select('EVI').mean()

        # ===============================
        # RAINFALL
        # ===============================
        chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY").filterDate(start, end)

        rainfall_total = ee.Image(
            ee.Algorithms.If(
                chirps.size().gt(0),
                chirps.sum(),
                ee.Image.constant(0)
            )
        )

        rainfall_std = ee.Image(
            ee.Algorithms.If(
                chirps.size().gt(0),
                chirps.reduce(ee.Reducer.stdDev()),
                ee.Image.constant(0)
            )
        )

        # ===============================
        # TEMPERATURE (FIXED → °C)
        # ===============================
        temp = (ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
                .filterDate(start, end)
                .select('temperature_2m')
                .mean()
                .subtract(273.15))

        # ===============================
        # SOIL MOISTURE
        # ===============================
        soil_moisture = (ee.ImageCollection("ECMWF/ERA5_LAND/DAILY_AGGR")
                         .filterDate(start, end)
                         .select('volumetric_soil_water_layer_1')
                         .mean())

        # ===============================
        # TERRAIN
        # ===============================
        dem = ee.Image("USGS/SRTMGL1_003")

        # ===============================
        # SOIL CARBON (FIXED)
        # ===============================
        soil_carbon = (ee.Image("OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02")
                       .select('b0')
                       .multiply(0.1))

        # ===============================
        # COMBINE
        # ===============================
        image = (
            ndvi_mean.rename('ndvi_mean')
            .addBands(ndvi_max.rename('ndvi_max'))
            .addBands(ndvi_std.rename('ndvi_std'))

            .addBands(ndwi_mean.rename('ndwi_mean'))
            .addBands(gndvi_mean.rename('gndvi_mean'))
            .addBands(savi_mean.rename('savi_mean'))
            .addBands(evi_mean.rename('evi_mean'))

            .addBands(rainfall_total.rename('rainfall_total'))
            .addBands(rainfall_std.rename('rainfall_std'))

            .addBands(temp.rename('temperature'))
            .addBands(soil_moisture.rename('soil_moisture'))

            .addBands(dem.rename('elevation'))
            .addBands(soil_carbon.rename('soil_carbon'))
        )

        raw = image.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=point,
            scale=10
        ).getInfo()

        # ===============================
        # FINAL OUTPUT
        # ===============================
        values = {
            "NDVI": raw.get("ndvi_mean"),
            "NDWI": raw.get("ndwi_mean"),
            "SAVI": raw.get("savi_mean"),
            "GNDVI": raw.get("gndvi_mean"),

            "ndvi_mean": raw.get("ndvi_mean"),
            "ndvi_max": raw.get("ndvi_max"),
            "ndvi_std": raw.get("ndvi_std"),

            "ndwi_mean": raw.get("ndwi_mean"),
            "gndvi_mean": raw.get("gndvi_mean"),
            "savi_mean": raw.get("savi_mean"),

            "evi_mean": raw.get("evi_mean"),

            "rainfall_total": raw.get("rainfall_total"),
            "rainfall": raw.get("rainfall_total"),
            "rainfall_std": raw.get("rainfall_std"),

            "temperature": raw.get("temperature"),
            "temp_mean": raw.get("temperature"),

            "soil_moisture": raw.get("soil_moisture"),
            "elevation": raw.get("elevation"),
            "soil_carbon": raw.get("soil_carbon"),
        }

        return ProviderResult(
            values=values,
            sources={k: {"provider": "GEE", "status": "ok"} for k in values},
            warnings=[]
        )

    # ==========================================
    # GEE INIT
    # ==========================================
    def _init_gee(self):
        if self._gee_initialized:
            return

        PROJECT_ID = "total-amp-457118-j7"

        try:
            try:
                ee.Initialize(project=PROJECT_ID)
            except Exception:
                ee.Authenticate()
                ee.Initialize(project=PROJECT_ID)

            self._gee_initialized = True
            print("✅ GEE initialized")

        except Exception as e:
            raise RuntimeError(f"GEE init failed: {e}")