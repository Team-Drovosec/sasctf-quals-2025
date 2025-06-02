#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

void
menu ()
{

  printf ("|=========------------- -- - .\n");
  printf ("[1] Make a copy.\n");
  printf ("[2] Explore the area yourself.\n");
  printf ("|===-------- - -- - .  .\n");
  printf ("[Mickey-%d]: ", getpid ());
}

void
intro ()
{

  FILE *fd = fopen ("mickey-face.txt", "r");

  if (fd)
    {

      int art_size = 2000;
      char *art = (char *)calloc (art_size, sizeof (char));

      fread (art, 1, art_size, fd);
      fclose (fd);

      puts (art);
      free (art);
    }
}

void
make_copy ()
{

  pid_t child = fork ();

  if (child)
    { /* Parent process */

      int status;
      wait (&status);
      printf ("[Corp]: Connection to Mickey-%d lost.\n", child);
    }
  else
    { /* Child process */

      printf ("[Corp]: Copy successfully initialized.\n");
      intro ();
      printf ("[Corp]: Please confirm operational stability.\n");
      printf ("[Mickey-%d]: ", getpid ());

      char reaction[16];
      read (STDIN_FILENO, reaction, 0x64);
    }
}

int
main ()
{

  setbuf (stdout, NULL); /* Disable stdout buffering */
  setbuf (stdin, NULL);  /* Disable stdin buffering */

  while (1)
    {

      menu ();

      int choice = -1;
      scanf ("%d", &choice);
      getchar ();

      if (choice == 1)
        { /* Create a copy. */

          printf ("[Corp]: Initializing copy protocol...\n");
          make_copy ();
        }
      else if (choice == 2)
        { /* Exit to explore manually. */

          return 0;
        }
      else
        { /* Invalid option */

          printf ("[Corp]: Communication failure. Probation period terminated.\n");
          return 0;
        }
    }
}