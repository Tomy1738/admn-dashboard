// Assuming useFormAction is defined like this:
import { useState } from 'react';

export default function useFormAction(action: Function) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);

  const formAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);

    try {
      const formData = new FormData(event.currentTarget);
      const result = await action(undefined, formData); // Adjust as necessary

      if (typeof result === 'string') {
        setErrorMessage(result);
      } else {
        setErrorMessage(undefined);
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred.');
    } finally {
      setIsPending(false);
    }
  };

  return [errorMessage, formAction, isPending] as const;
}