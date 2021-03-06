all: glasgow.js

glasgow.js: glasgow-device.js max.js api.js music.js gen.js vendor/underscore.js
	cat glasgow-device.js api.js music.js vendor/underscore.js max.js > build/glasgow.js

modulr.js: modulr-device.js max.js api.js music.js gen.js vendor/underscore.js
	cat modulr-device.js max.js api.js music.js vendor/underscore.js > build/modulr.js
	
test:
	cat api.js music.js vendor/underscore.js gen.js test.js node-rt.js > build/mocha-test.js
	mocha build/mocha-test.js

test-lisp:
	cat api.js music.js vendor/underscore.js vendor/parks-lisp.js test-lisp.js node-rt.js > build/mocha-testlisp.js
	mocha build/mocha-testlisp.js

clean:
	rm build/glasgow.js
	rm build/mocha-test.js

readme:
	marked README.md -o build/readme.html

selfzip:
	zip ../glasgow-`date +'%m-%d-%Y'`.zip -pp glasgow -r *