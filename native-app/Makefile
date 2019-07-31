CC=g++
CFLAGS=-Wall -std=c++11 -O3 -Wno-unused-result -Wno-unused-variable
LIBS=-pthread
LFLAGS=
INCLUDES=
# =========================================================
# see here for an explanation of options for static linking
# https://stackoverflow.com/a/45271521/10154542
# =========================================================
STATIC_LIBS=-static -Wl,--whole-archive -lpthread -Wl,--no-whole-archive

# C++/C source files
SRCCPP=main.cpp utils.cpp json/json11.cpp watcher/watcher.cpp
SRCC=dialogs/tinyfiledialogs.c

# target binary
TARGET=filewatcher

# define the C object files 
OBJ=$(SRCCPP:.cpp=.o)
OBJ+=$(SRCC:.c=.o)
#OBJC=$(SRCC:.c=.o)

# build command line
BUILDCMD=$(CC) $(CFLAGS) $(INCLUDES) -o $(TARGET) $(OBJ) $(LFLAGS) $(LIBS)


# rules
all: $(TARGET)
	@echo Filewatcher has been compiled

$(TARGET): $(OBJ)
	$(BUILDCMD)

static: $(OBJCPP) $(OBJ)
	$(BUILDCMD) $(STATIC_LIBS)

.PHONY: clean
clean:
	$(RM) $(OBJ) $(MAIN)
