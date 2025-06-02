#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define SIGN_TYPE_NFT 0
#define SIGN_TYPE_COMPLIMENT 1

typedef struct
{
    unsigned int type;
    void *value;
} sign_of_attention;

typedef struct
{
    int love_poits;
    int consecutive_compliments;
    int consecutive_nfts;
    int mood;
    int prev_nft;
    char *prev_compliment;
} partner_state;

void
update_mood (partner_state *girl, int total_delta)
{

    if (total_delta < 0)
        {
            
            girl->mood = -1;
        }
    else
        {
            girl->mood = 0;
        }
}

partner_state
init_partner ()
{

    partner_state girl;

    memset (&girl, 0, sizeof (partner_state));
    girl.love_poits = 50;
    girl.prev_nft = -1;

    puts ("Mila joined the chat");
    puts ("~ Hey cutie~! I'm here just for you <3");

    return girl;
}

char
get_user_choice ()
{

    char choice = '\x00';
    scanf (" %c", &choice);
    getchar ();

    return choice;
}

void
menu_create_sign (partner_state *girl)
{

    puts   ("");
    printf ("+-------[ %02d / 100 ]-------+\n", girl->love_poits);
    puts   ("| [n] Create a NFT.        |");
    puts   ("| [c] Create a compliment. |");
    puts   ("+--------------------------+");
    printf ("Enter your choice (n/c): ");
}

sign_of_attention
create_nft ()
{

    sign_of_attention nft;
    nft.type = SIGN_TYPE_NFT;

    printf ("Enter the cost of the NFT: ");
    scanf (" %d", &nft.value);
    getchar ();

    return nft;
}

void
edit_nft (sign_of_attention *nft)
{

    printf ("Reenter the cost of the NFT: ");
    scanf (" %d", &nft->value);
    getchar ();
}

sign_of_attention
create_compliment ()
{

    sign_of_attention compliment;
    compliment.type = SIGN_TYPE_COMPLIMENT;
    compliment.value = (char *)calloc (256, sizeof (char));

    printf ("Enter the compliment text (max 256 chars): ");
    fgets (compliment.value, 256, stdin);

    return compliment;
}

void
edit_compliment (sign_of_attention *compliment)
{

    printf ("Reenter the compliment text (max 256 chars): ");
    fgets (compliment->value, 255, stdin);
}

void
menu_play_sign (partner_state *girl)
{

    puts   ("");
    printf ("+-------[ %02d / 100 ]-------+\n", girl->love_poits);
    puts   ("| [n] Edit the NFT.        |");
    puts   ("| [c] Edit the compliment. |");
    puts   ("| [p] Play it.             |");
    puts   ("+--------------------------+");
    printf ("Enter your choice (n/c/p): ");
}

int
check_compliment_length (sign_of_attention *compliment)
{

    int len = strlen (compliment->value);
    if (len < 20)
        {

            int sanction = -5;
            printf ("~ Your compliment is too short. Try harder! (%d)\n",
                    sanction);
            return sanction;
        }
    else if (len > 100)
        {

            int sanction = -7;
            printf ("~ Wow, someone's being too wordy! Keep it simple. (%d)\n",
                    sanction);
            return sanction;
        }
    else
        {
            return 0;
        }
}

int
check_nft_value (sign_of_attention *nft)
{

    if ((int)nft->value < 50)
        {

            int sanction = -10;
            printf ("~ Is this some kind of joke? You can do better. (%d)\n",
                    sanction);
            return sanction;
        }
    else if ((int)nft->value > 500)
        {

            int sanction = -15;
            printf ("~ Are you trying to buy my love?! Keep some for your "
                    "collection too! It will grow! (%d)\n",
                    sanction);
            return sanction;
        }
    else
        {
            return 0;
        }
}

int
check_compliment_spam (partner_state *girl)
{

    int sanction = -12;
    if (girl->consecutive_compliments >= 3)
        {
            printf ("~ Enough sweet talk! Show me some action. Buy some NFTs "
                    "from this private collection in my bio. (%d)\n",
                    sanction);
            return sanction;
        }
    else
        {
            return 0;
        }
}

int
check_nft_spam (sign_of_attention *nft, partner_state *girl)
{

    int sanction = -10;
    if (girl->consecutive_nfts >= 2)
        {

            printf (
                "~ Give me some time! I can't mi... take it that fast. (%d)\n",
                sanction);
            return sanction;
        }
    return 0;
}

int
check_repeat_compliment (sign_of_attention *compliment, partner_state *girl)
{

    if (girl->prev_compliment != NULL)
        {

            int sanction = -8;
            if (strcmp (girl->prev_compliment, compliment->value) == 0)
                {

                    printf (
                        "~ Did I hear this before? Be more creative! (%d)\n",
                        sanction);
                    return sanction;
                }
        }
    return 0;
}

int
check_nft_vs_love (sign_of_attention *nft, partner_state *girl)
{

    if ((int)nft->value > 20 + girl->love_poits * 2)
        {

            int sanction = -15;
            printf (
                "~ That's too much too soon! I know you can do more! (%d)\n",
                sanction);
            return sanction;
        }
    return 0;
}

int
check_repeat_nft (sign_of_attention *nft, partner_state *girl)
{

    if ((int)nft->value == girl->prev_nft)
        {

            int sanction = -6;
            printf ("~ Yet another? There's more options to buy! (%d)\n",
                    sanction);
            return sanction;
        }
    return 0;
}

int
check_uppercase_compliment (sign_of_attention *compliment)
{

    for (char *c = compliment->value; *c; ++c)
        {

            if (isupper ((unsigned char)c[0]) == 0)
                {

                    return 0;
                }
        }

    int sanction = -4;
    printf ("~ Why are you shouting? Money likes silence! (%d)\n", sanction);
    return sanction;
}

void
play_sign (sign_of_attention *sign, partner_state *girl)
{

    puts ("");

    int delta = 0;
    if (sign->type == SIGN_TYPE_NFT)
        {

            girl->consecutive_nfts += 1;
            girl->consecutive_compliments = 0;

            delta += check_nft_value (sign);
            delta += check_nft_spam (sign, girl);
            delta += check_repeat_nft (sign, girl);
            delta += check_nft_vs_love (sign, girl);

            girl->prev_nft = (int)sign->value;
        }
    else if (sign->type == SIGN_TYPE_COMPLIMENT)
        {

            girl->consecutive_compliments += 1;
            girl->consecutive_nfts = 0;

            delta += check_compliment_length (sign);
            delta += check_compliment_spam (girl);
            delta += check_repeat_compliment (sign, girl);
            delta += check_uppercase_compliment (sign);

            girl->prev_compliment = sign->value;
        }

    int stimulation = 7;
    printf ("~ I'm getting used to you. (+%d)\n", stimulation);
    delta += stimulation;

    girl->love_poits += delta;

    update_mood (girl, delta);
}

void
win ()
{

    puts ("");
    puts ("<3 <3 <3 <3 <3 <3 <3 <3 <3 <3 <3 <3 <3 <3 <3");
    puts ("Bro thank you for the money!!!");
    puts ("Those feet pics I sent was AI generated and I'm not a girl lol. "
          "Better use your money to straight away buy the flag next time.");
    puts ("xD xD xD xD xD xD xD xD xD xD xD xD xD xD xD");
}

void
lose ()
{

    puts ("");
    puts ("X X X X X X X X X X X X X X X X X X X X X X X");
    puts ("Sorry babe, I'm just not your type :(");
    puts ("You'll definitely succeed with someone else!");
    puts ("X X X X X X X X X X X X X X X X X X X X X X X");
}

int
main ()
{

    setbuf (stdin, NULL);
    setbuf (stdout, NULL);

    partner_state girl = init_partner ();

    while ((girl.love_poits > 0) && (girl.love_poits < 100))
        {

            menu_create_sign (&girl);
            sign_of_attention sign;

            char choice = get_user_choice ();
            if (choice == 'n')
                {

                    sign = create_nft ();
                }
            else if (choice == 'c')
                {

                    sign = create_compliment ();
                }
            else
                {

                    exit (1);
                }

            while (1)
                {

                    menu_play_sign (&girl);

                    char choice = get_user_choice ();
                    if (choice == 'n')
                        {

                            edit_nft (&sign);
                        }
                    else if (choice == 'c')
                        {

                            edit_compliment (&sign);
                        }
                    else if (choice == 'p')
                        {

                            play_sign (&sign, &girl);
                            break;
                        }
                    else
                        {

                            exit (1);
                        }
                }
        }

    if (girl.love_poits > 99)
        {

            win ();
        }
    else
        {
            lose ();
        }

    return 0;
}