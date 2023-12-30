## Create a textfile

<!--@abc: exec() -->
```bash
echo "Hello from runtime 1, AutoBashCraft" > testfile
cat testfile
```

<img src="./assets/save_test_0.gif" width="500"/>


## Save the runtime state as "my_runtime_state_1"
`<!--@abc: snapshot({"name": "my_runtime_state_1"}) -->`
<!--@abc: snapshot({"name": "my_runtime_state_1"}) -->

## Overwrite the textfile
<!--@abc: exec() -->
```bash
echo "Hello from runtime 2, AutoBashCraft" > testfile
cat testfile
```

<img src="./assets/save_test_2.gif" width="500"/>


## Save the runtime state as "my_runtime_state_2"
`<!--@abc: snapshot({"name": "my_runtime_state_2"}) -->`
<!--@abc: snapshot({"name": "my_runtime_state_2"}) -->

## Load the runtime state "my_runtime_state_1"
`<!--@abc: init({"baseImage": "my_runtime_state_1"}) -->`
<!--@abc: init({"baseImage": "my_runtime_state_1"}) -->

## cat the textfile
<!--@abc: exec() -->
```bash
cat testfile
```

<img src="./assets/save_test_5.gif" width="500"/>

## Load the runtime state "my_runtime_state_2"
`<!--@abc: init({"baseImage": "my_runtime_state_2"}) -->`
<!--@abc: init({"baseImage": "my_runtime_state_2"}) -->

## cat the textfile
<!--@abc: exec() -->
```bash
cat testfile
```

<img src="./assets/save_test_7.gif" width="500"/>