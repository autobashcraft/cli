<!--@abc: config({"asciinema":{"rows": 8, "cols": 60 }}) -->

<!--@abc: create({"path":"newfile.sh"}) -->
```bash
#!/bin/bash

echo "Content for the new file"

```

<!--@abc: exec() -->
```bash
cat newfile.sh
chmod +x newfile.sh
./newfile.sh
```

<img src="assets/create_test_1.gif" />