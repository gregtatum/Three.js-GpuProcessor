#Three.js GPU Processor

A GPGPU class for Three.js. Create shader passes that can optionally read back 32 bit float values
from the GPU. View index.html for usage. Contributions and comments welcomed. This is my first
pass at this code.

##Usage

	var gpuProcessor = new THREE.GpuProcessor(3); //Creates a texture of size 2^3 * 2^3 = 64 pixels

	//Add a pass that reads the results into a Float32Array
	var pass1 = gpuProcessor.addPass(shaderMaterial);

	//Add a pass that just processes
	var pass2 = gpuProcessor.addPass(shaderMaterial2, {
		readPixels : false,
		rtDataType: THREE.FloatType
	}

	gpuProcessor.renderPasses();

	//Results of the first pass
	gpuProcessor.floatArray[pass1];

	//Second pass is null
	gpuProcessor.floatArray[pass2];

	//But you can access the render target
	gpuProcessor.renderTargets[pass2]

In your fragment shader just set the `gl_FragColor = encode_float(valueToReturn)`