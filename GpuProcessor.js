/*
 * @author TatumCreative - Greg Tatum, http://gregtatum.com/
 */

THREE.GpuProcessor = function(power) {
	
	this.quads = [];			//THREE.Mesh
	this.scenes = [];			//THREE.Scene
	this.renderTargets = [];	//THREE.WebGLRenderTarget
	this.doReadPixels = [];		//boolean
	this.buffers = [];			//ArrayBuffer
	this.uIntArray = [];		//Uint32Array
	this.floatArray = [];		//Float32Array

	this.setSizeByPower(power);
	
	this.quadGeometry = new THREE.PlaneGeometry(this.width, this.height);
	this.renderer = new THREE.WebGLRenderer();
	this.renderer.setSize(this.width, this.height);
	this.camera = new THREE.OrthographicCamera(
		this.width / -2,
		this.width / 2,
		this.height / 2,
		this.height / - 2,
		-1,
		1
	);
};

THREE.GpuProcessor.prototype = {
	
	//Sets width and height to the 2^power
	setSizeByPower : function(power) {
		this.width = Math.pow(2, power);
		this.height = Math.pow(2, power);
		this.size = this.width * this.height;
	},
	
	/*
	 *	options = {
	 *		rtDataType : THREE.UnsignedByteType //UnsignedByteType required to readPixels
	 *		readPixels : true
	 *	}
	 */
	
	addPass : function(shaderMaterial, options) {
		
		var renderTarget, scene, quad, buffer, type, doReadPixels;
		
		if(typeof(options) !== 'object') {
			options = {};
		}
		
		//Add the encode float function
		shaderMaterial.fragmentShader = [this.encodeFloat, shaderMaterial.fragmentShader].join("\n");
		
		quad = new THREE.Mesh(this.quadGeometry, shaderMaterial);
		this.quads.push( quad );
		
		scene = new THREE.Scene();
		this.scenes.push( scene );
		scene.add(quad);
		
		type = options.rtDataType || THREE.UnsignedByteType;
		
		renderTarget = new THREE.WebGLRenderTarget(
			this.width,
			this.height,
			{
				wrapS:		THREE.ClampToEdgeWrapping ,
				wrapT:		THREE.ClampToEdgeWrapping ,
				minFilter:	THREE.NearestFilter,
				magFilter:	THREE.NearestFilter,
				format:		THREE.RGBAFormat,
				type:		type
			}
		);
		this.renderTargets.push(renderTarget);
		
		doReadPixels = options.readPixels !== false && type === THREE.UnsignedByteType;
		this.doReadPixels.push(doReadPixels);
		
		if(doReadPixels) {
			
			//The buffer stores the raw returned data
			buffer = new ArrayBuffer(this.size * 4);
			this.buffers.push( buffer );

			//The buffer views show the data as either an unsigned 8 bit integer, or 32 bit float
			this.uIntArray.push( new Uint8Array( buffer ) );
			this.floatArray.push( new Float32Array( buffer ) );

		} else {
			
			this.buffers.push( null );
			this.uIntArray.push( null );
			this.floatArray.push( null );
			
		}
		
		//Return the pass index
		return this.quads.length - 1;
	},
	
	renderPasses : function() {
		var i, il,
			gl = this.renderer.context;
		
		for(i=0, il = this.scenes.length; i < il; i++) {
			
			this.renderer.setClearColor( new THREE.Color(0xffffff) );			
			
			this.renderer.render(
				this.scenes[i],
				this.camera,
				this.renderTargets[i],
				true //forceclear
			);
			
			if(this.doReadPixels[i]) {
				gl.readPixels(
					0, 0, this.width, this.height, //Which pixels to read
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					this.uIntArray[i]
				);
			}
		}
	},
	
	//Encode float credits:
	//http://www.khronos.org/webgl/public-mailing-list/archives/1206/msg00233.html
	//http://lab.concord.org/experiments/webgl-gpgpu/webgl.html
	encodeFloat : [
		"float shift_right(float v, float amt) {",
		"	v = floor(v) + 0.5;",
		"	return floor(v / exp2(amt));",
		"}",
		"float shift_left(float v, float amt) {",
		"	return floor(v * exp2(amt) + 0.5);",
		"}",
		"float mask_last(float v, float bits) {",
		"	return mod(v, shift_left(1.0, bits));",
		"}",
		"float extract_bits(float num, float from, float to) {",
		"	from = floor(from + 0.5);",
		"	to = floor(to + 0.5);",
		"	return mask_last(shift_right(num, from), to - from);",
		"}",
		"vec4 encode_float(float val) {",
		"	if (val == 0.0)",
		"	return vec4(0, 0, 0, 0);",
		"	float sign = val > 0.0 ? 0.0 : 1.0;",
		"	val = abs(val);",
		"	float exponent = floor(log2(val));",
		"	float biased_exponent = exponent + 127.0;",
		"	float fraction = ((val / exp2(exponent)) - 1.0) * 8388608.0;",
		"	float t = biased_exponent / 2.0;",
		"	float last_bit_of_biased_exponent = fract(t) * 2.0;",
		"	float remaining_bits_of_biased_exponent = floor(t);",
		"	float byte4 = extract_bits(fraction, 0.0, 8.0) / 255.0;",
		"	float byte3 = extract_bits(fraction, 8.0, 16.0) / 255.0;",
		"	float byte2 = (last_bit_of_biased_exponent * 128.0 + extract_bits(fraction, 16.0, 23.0)) / 255.0;",
		"	float byte1 = (sign * 128.0 + remaining_bits_of_biased_exponent) / 255.0;",
		"	return vec4(byte4, byte3, byte2, byte1);",
		"}"
	].join("\n")
};