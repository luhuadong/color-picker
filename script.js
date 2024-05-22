document.getElementById('imageFile').addEventListener('change', function (e) {
    var file = e.target.files[0];
    var reader = new FileReader();

    if (file) {
        reader.onload = function (e) {
            var image = new Image();
            image.onload = function () {
                var canvas = document.getElementById('pickerCanvas');
                var ctx = canvas.getContext('2d');

                // 根据图片和屏幕的大小来缩放图片  
                var maxWidth = canvas.parentElement.offsetWidth - 10; // 减去边框宽度  
                var maxHeight = window.innerHeight - 200; // 假设顶部和底部有一些空间  
                var ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
                var width = image.width * ratio;
                var height = image.height * ratio;

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(image, 0, 0, width, height);

                // 添加鼠标移动事件监听器来拾取颜色  
                canvas.addEventListener('mousemove', function (e) {
                    var rect = canvas.getBoundingClientRect();
                    var x = e.clientX - rect.left;
                    var y = e.clientY - rect.top;

                    if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                        // 放大镜功能（这里简化处理，仅显示颜色值）  
                        // 你可以通过创建一个新的 canvas 来绘制放大的部分  
                        var imageData = ctx.getImageData(x, y, 1, 1).data;
                        var r = imageData[0];
                        var g = imageData[1];
                        var b = imageData[2];
                        var color = 'rgb(' + r + ',' + g + ',' + b + ')';
                        var colorValue = '#' +
                            (('0' + r.toString(16)).slice(-2)) +
                            (('0' + g.toString(16)).slice(-2)) +
                            (('0' + b.toString(16)).slice(-2));

                        document.getElementById('colorDisplay').textContent = '当前颜色: ' + colorValue;
                        document.getElementById('colorBox').style.backgroundColor = color;
                    }
                });
            };
            image.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});