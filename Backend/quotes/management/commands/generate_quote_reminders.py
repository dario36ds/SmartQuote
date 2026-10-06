import time

from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections

from quotes.reminders import generate_due_reminders


class Command(BaseCommand):
    help = "Genera i promemoria per i preventivi inviati senza risposta."

    def add_arguments(self, parser):
        parser.add_argument("--watch", action="store_true", help="Controlla periodicamente i preventivi.")
        parser.add_argument("--interval", type=int, default=60, help="Secondi tra i controlli (default: 60).")

    def handle(self, *args, **options):
        if options["interval"] < 1:
            raise CommandError("L’intervallo deve essere almeno un secondo.")
        try:
            while True:
                if options["watch"]:
                    close_old_connections()
                created = generate_due_reminders()
                if created or not options["watch"]:
                    self.stdout.write(f"Promemoria creati: {created}")
                if not options["watch"]:
                    break
                time.sleep(options["interval"])
        except KeyboardInterrupt:
            pass
        finally:
            if options["watch"]:
                close_old_connections()
