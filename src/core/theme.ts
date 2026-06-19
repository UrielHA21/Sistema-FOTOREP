import { createTheme } from '@mantine/core';

export const theme = createTheme({
    primaryColor: 'blue', // El azul institucional CFE indicado en el documento
    defaultRadius: 'md',
    fontFamily: 'Inter, sans-serif',
    headings: { fontFamily: 'Inter, sans-serif' },
    components: {
        Button: {
            defaultProps: {
                fw: 500,
            },
            styles: {
                root: {
                    border: '1.5px solid currentColor',
                }
            }
        },
        ActionIcon: {
            styles: {
                root: {
                    border: '1.5px solid currentColor',
                }
            }
        },
        Card: {
            defaultProps: {
                shadow: 'sm',
                withBorder: true,
            }
        }
    },
});