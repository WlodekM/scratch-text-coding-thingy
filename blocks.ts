interface Input {
    name: string,
    type: number
}

export default {
    'looks_say': [
        {
            name: 'MESSAGE',
            type: 3
        }
    ],
    'motion_gotoxy': [
        {
            name: 'X',
            type: 3
        }
    ]
} as Record<string, Input[]>