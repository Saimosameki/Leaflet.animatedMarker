L.AnimatedMarker = L.Marker.extend({
    options: {
        speetX: 1,
        speedList: [],
        // meters（米）
        distance: 500,
        // ms（毫秒）
        interval: 1000,
        // animate on add?
        autoStart: false,
        isPlay: false,
        // 动画完成回调
        onEnd:null,
        //动画路径回溯绘制
        playCall: null
    },

    initialize: function (latlngs, options) {
        Object.assign(this.options, options);
        this.isZooming = false;
        L.Marker.prototype.initialize.call(this, latlngs[0], options);
        this.setLine(latlngs);
        this.resetIcon()
    },

    resetIcon: function () {
        const v = this
        var iconOption = v.options.icon.options
        var Icon = L.DivIcon.extend({
            createIcon: function () {
                // outerDiv.style.transform is updated by Leaflet
                var outerDiv = document.createElement('div');
                outerDiv.style.width = iconOption.iconSize[0] + "px"
                outerDiv.style.height = iconOption.iconSize[1] + "px"
                outerDiv.style.position = "absolute"
                v.div = document.createElement('div');
                v.div.style.width = iconOption.iconSize[0] + "px"
                v.div.style.height = iconOption.iconSize[1] + "px"
                v.div.style.transition = 'all linear 100ms'
                v.div.style.transformOrigin = 'center'
                v.div.style.transform = 'translate3d(-' + iconOption.iconAnchor[0] + 'px, -' + iconOption.iconAnchor[1] + 'px, 0) rotate(-' + v._latlngs[0].bearing + 'deg)';
                const img = document.createElement('img');
                img.src = iconOption.iconUrl;
                img.width = iconOption.iconSize[0];
                img.height = iconOption.iconSize[1];
                v.div.appendChild(img);
                outerDiv.appendChild(v.div);
                return outerDiv;
            },
            //图标朝向
            // rotate(deg) {
            //   if ((v.before && (Math.abs(v.before - deg) >= 180))) {
            //     v.div.style.transition = 'none'
            //   } else {
            //     v.div.style.transition = 'transform linear 100ms'
            //     // var _speed = 100 / v.options.speetX + 'ms'
            //     // v.div.style.transition = 'transform linear ' + _speed
            //   }
            //   v.div.style.transform = 'translate3d(-19px, -13px, 0) rotate(-' + deg + 'deg)';
            //   v.before = deg
            // },
            iconSize: iconOption.iconSize,
        })
        this.icon = new Icon()
        this.setIcon(this.icon)
    },
    onAdd: function (map) {
        L.Marker.prototype.onAdd.call(this, map);
        this.map = map;
        const _this = this
        map.addEventListener('zoomstart', function () {
            _this.isZooming = true;
        });
        map.addEventListener('zoomend', function () {
            _this.isZooming = false;
        });

        // Start animating when added to the map
        if (this.options.autoStart) {
            this.start();
        }
    },

    animate: function () {
        var now = Date.now();
        var end = this.startedAt + this.duration;
        if (now < end && this.getLatLng().distanceTo(this.startLatLng) < this.nextLatLng.distanceTo(this.startLatLng)) {
            if (this.isPlay) {
                requestAnimationFrame(this.animate.bind(this));
            }
        } else if (this._i < (this._latlngs.length - 1)) {
            if (this.speetChange) {
                this._latlngs = this._latlngsnew
                this.speetChange = false
            }
            this.startedAt = Date.now();
            this.startLatLng = this._latlngs[this._i]
            this.nextLatLng = this._latlngs[this._i + 1]
            this.duration = this.startLatLng.duration
            this.setLatLng(this._latlngs[this._i]);
            // this.icon.rotate(this.startLatLng.bearing);
            this._i++;
            if (this.isPlay) {
                requestAnimationFrame(this.animate.bind(this));
            }
        }


        // 解决地图缩放是图标会偏移轨迹线问题
        if (!this.isZooming && this.map) {
            var t = now - this.startedAt;
            if (t > this.duration) { // 解决结束时图标位置超出终点问题
                t = this.duration
            }
            var lat = this.startLatLng.lat + ((this.nextLatLng.lat - this.startLatLng.lat) / this.startLatLng.duration * t);
            var lng = this.startLatLng.lng + ((this.nextLatLng.lng - this.startLatLng.lng) / this.startLatLng.duration * t);
            this.setLatLng({
                lat: lat,
                lng: lng
            });
            // 用于动态轨迹线展示
            if (this.options.playCall) {
                console.log('传递了一次当前坐标')
                this.options.playCall({
                    lat: lat,
                    lng: lng
                })
            }
        }
        //动画结束的回调
        if(typeof this.options.onEnd == 'function'){
            function once(fn) {
                let called = false;
                return new Proxy(fn, {
                    apply(target, thisArg, argumentsList) {
                        if (!called) {
                            called = true;
                            return Reflect.apply(target, thisArg, argumentsList);
                        }
                    }
                });
            }
            //只调用一次
            this.options.onEnd = once(this.options.onEnd)
            if(this._i == this._latlngs.length-1 && this.isPlay){
                setTimeout(()=>{
                    this.options.onEnd()
                },1000)
            }
        }
    },

    setSpeetX: function (_speetX) {
        var speed = _speetX / this.options.speetX
        this._latlngsnew = []
        for (var i = 0; i < this._latlngs.length; i++) {
            var _latlng = L.latLng(this._latlngs[i].lat, this._latlngs[i].lng);
            _latlng.duration = this._latlngs[i].duration / speed
            _latlng.bearing = this._latlngs[i].bearing
            this._latlngsnew.push(_latlng)
        }
        this.options.speetX = _speetX
        this.speetChange = true
    },

    // Start the animation
    start: function () {
        this.isPlay = true
        this.startedAt = Date.now();
        if (this.isPause) {
            this.startedAt = this.startedAt - this.playedTime
            this.isPause = false
        }
        this.animate()
    },

    pause: function () {
        this.playedTime = Date.now() - this.startedAt;
        this.isPause = true
        this.isPlay = false
    },

    // Stop the animation in place
    stop: function () {
        // console.log('stop')
        this.isPlay = false
        this.isPause = false
        this.startedAt = NaN
        this._i = 0
        // this.animate();
    },

    setLine: function (latlngs) {
        // console.log('distance' + this.options.distance)
        // console.log('interval' + this.options.interval)
        for (var i = 0; i < latlngs.length; i++) {
            if (i === latlngs.length - 1) {
                latlngs[i].duration = latlngs[i - 1].duration
                latlngs[i].bearing = latlngs[i - 1].bearing
            } else {
                if (this.options.speedList.length > 0 && this.options.speedList[i] !== undefined) {
                    latlngs[i].duration = latlngs[i].distanceTo(latlngs[i + 1]) / this.options.distance * (this.options.interval / this.options.speedList[i])
                } else {
                    latlngs[i].duration = latlngs[i].distanceTo(latlngs[i + 1]) / this.options.distance * this.options.interval
                }
                latlngs[i].bearing = this.getRotation(latlngs[i], latlngs[i + 1])
            }
        }
        this._latlngs = latlngs;
        this._i = 0;
    },

    getRotation: function (start, end) {
        var dx = end.lng - start.lng;
        var dy = end.lat - start.lat;
        var radian = Math.atan2(dy, dx); //弧度值
        var rotation = 180 * radian / Math.PI //转换为角度值
        if (rotation > -180 && rotation < 0) {
            rotation = 360 + rotation;
        }
        return rotation
    }

});

L.animatedMarker = function (latlngs, options) {
    return new L.AnimatedMarker(latlngs, options);
};
