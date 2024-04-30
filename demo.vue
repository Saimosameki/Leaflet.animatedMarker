<template>
    <div class="map-container">
        <div  id="map" class="gis-map"></div>
    </div>
</template>
<script>
import polylineDecorator from 'leaflet-polylinedecorator'

export default {
    props:['path','center','mapLayer'],
    name: "locusMap",
    data() {
        return {
            map:null,
            animateMarker:null,
            polyline:null,
            realPolyline:null,
            decorator:null,
            newPath:[],
            drawnItems:null,
            update:true
        }
    },
    watch: {
        mapLayer() {
            this.initLeaftMap()
        }
    },
    mounted() {
        this.initLeaftMap()
    },
    methods:{
        initLeaftMap() {
            if (this.map) this.map.remove();
            this.map = null;
            //限制地图的拖动范围是正负90到正负180，这样才合理。
            var corner1 = L.latLng(-90, -180); //设置左上角经纬度
            var corner2 = L.latLng(90, 180);	//设置右下点经纬度
            var bounds = L.latLngBounds(corner1, corner2); //构建视图限制范
            //自定义leaflet天地图经纬度坐标
            //设置地图相关初始配置
            this.map = L.map("map", {
                center:this.center,
                minZoom: 9,
                maxZoom: 16,
                preferCanvas:true,
                zoom: 10, //初始地图缩放级别
                crs: L.CRS.EPSG4326,//设置坐标系4326
                scrollWheelZoom: true, //默认开启鼠标滚轮缩放
                zoomControl: false, //禁用 + - 按钮
                doubleClickZoom: false, // 禁用双击放大
                attributionControl: false, // 移除右下角leaflet标识
                // maxBounds: bounds,
            });
            //密钥
            const TK_KEY = "your key";

            // 底图
            //vec_c 交通标记
            const vec_c = 'http://{s}.tianditu.gov.cn/vec_c/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=c&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk='
            //cta_c 地名地点标记
            const cta_c = 'http://{s}.tianditu.com/cta_c/wmts?layer=cta&style=default&tilematrixset=c&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}&tk=';
            const VEC_C = 'http://{s}.tianditu.com/img_c/wmts?layer=img&style=default&tilematrixset=c&Service=WMTS&Request=GetTile&Version=1.0.0&Format=tiles&TileMatrix={z}&TileCol={x}&TileRow={y}&tk=';
            if(this.mapLayer){
                L.tileLayer(vec_c + TK_KEY, {
                    maxZoom: 18,
                    tileSize: 256,
                    zoomOffset: 1,
                    subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
                }, { noWrap: false }).addTo(this.map);
                L.tileLayer(cta_c + TK_KEY, {
                    maxZoom: 18,
                    tileSize: 256,
                    zoomOffset: 1,
                    subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
                }, { noWrap: false }).addTo(this.map);
            }else{
                L.tileLayer(VEC_C + TK_KEY, {
                    maxZoom: 18,
                    tileSize: 256,
                    zoomOffset: 1,
                    subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
                }, { noWrap: false }).addTo(this.map);
                L.tileLayer(cta_c + TK_KEY, {
                    maxZoom: 18,
                    tileSize: 256,
                    zoomOffset: 1,
                    subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'],
                }, { noWrap: false }).addTo(this.map);
            }
            //绘制飞线路径
            //新建图层
            this.drawnItems = new L.FeatureGroup();
            //添加绘制图层
            this.map.addLayer(this.drawnItems);

            this.strokePolyLine(this.path, this.drawnItems)
            this.strokeDecorator(this.path, this.drawnItems)
            this.addMarker(this.polyline.getLatLngs(), this.drawnItems)
            this.animateMarker.start()
        },
        //绘制轨迹
        strokePolyLine(path,Layer){
            this.polyline = L.polyline(path, {
                weight:8,
            }).addTo(Layer)
        },
        //绘制实时轨迹
        realTimeLine(path=[],Layer){
            this.realPolyline = L.polyline(path, {
                weight:8,
                color:'#FF9900'
            }).addTo(Layer)

        },
        //绘制轨迹方向
        //注意该功能是leaflet社区插件中的另外一款插件，只是当前我的业务需要下载的
        strokeDecorator(path,Layer){
            this.decorator = L.polylineDecorator(path, {
                patterns:[
                    {
                        repeat:50,
                        symbol:L.Symbol.arrowHead({
                            pixelSize:5,
                            headAngle:75,
                            polygon:false,
                            pathOptions:{
                                stroke:true,
                                weight:2,
                                color:'#FFFFFF',
                            }
                        })
                    }
                ]
            }).addTo(Layer)
        },
        //动态marker
        addMarker(path,Layer){
            let timer = 500
            //由于该插件动画是基于CSS3 的动画，所以需要设置固定缩放范围，否则动画路径绘制有大概率会与初始路径绘制出现偏差
            this.map.setMinZoom(10)
            this.map.setMaxZoom(10)
            let anime = require('leaflet.animatedmarker/src/AnimatedMarker');
            this.animateMarker = L.animatedMarker(path, {
                speedList: [20, 20, 20, 20, 20],
                interval: timer,
                autoStart: false,
                loop: true,
                playCall:(latLng)=>{
                    this.updateRealLine(latLng,Layer)
                },
                icon: L.icon({
                    iconUrl:require('@/assets/drone/drone.png'),
                    iconSize:[50,50],
                    iconAnchor:[37,21]
                }),
                onEnd:()=>{
                    console.log('marker动画完成')
                    this.polyline.removeFrom(Layer)
                    //动画绘制路径回溯完成后再开启地图的缩放范围，防止动画路径回溯绘制出现偏差
                    this.map.setMinZoom(9)
                    this.map.setMaxZoom(16)
                }
            }).addTo(Layer)
        },
        updateRealLine(latLng,Layer){
           this.newPath.push([latLng.lat,latLng.lng])
           this.realTimeLine(this.newPath,Layer)
           this.strokeDecorator(this.newPath,Layer)
        },
    },
}
</script>
<style scoped lang="less">
.map-container{
    width: 100%;
    height: 100%;
    .gis-map{
        width: 100%;
        height: 100%;
    }
}
</style>
