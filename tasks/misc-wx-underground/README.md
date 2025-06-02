## Title
WX Underground

## Description
Decades ago, the great city of Cockbit was wiped from the map of our world. Ever since, nestled amid the forsaken stones of the once-mighty city, a hidden corridor stirs to life for a day in a year. What lies at its end defies the understanding of conventional science. Those few who have returned speak of IT with ceaseless awe.

Only true hero can surpass all the obstacles and emerge victory over this dangerous creature. If only we knew who can instill hope to the hearts of oppressed...

## Solution
The challenge was inspired by the [RWX - Gold](https://ctftime.org/task/30126) task from KalmarCTF 2025 and differs primarily in: the base image is Alpine Linux rather than Ubuntu, the command‐line length limit is four characters instead of three, and you are not allowed to use the pipe character (|). In this challenge, you have a "write file" function and an "execute" function the command length of which is strictly limited to four characters, and your goal is to run the target binary with these exact arguments `/tung tung tung tung tung sahur`. 

The intended solution relies on a wildcard‐injection technique: by creating files in your home directory whose names encode fragments of the desired command, you can pass a four‐character payload such as `cd;*` to the limited “execute” function. When the shell expands the * wildcard, it concatenates all filenames in the directory into a longer command string. In this way, you bypass the four‐character limit, allowing the concatenated filenames to form and execute an arbitrary command.

During the implementation of this task, I overlooked the fact that using vi and its configuration file (.exrc) allows arbitrary code execution, and as a result, most teams solved the task that way.

## Flag
SAS{haha_w1ldc4rd_inj3cti0n_g0es_brr_brr_p4tap1m}

**Solved by:** 25 teams