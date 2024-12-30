const API_URL = 'http://localhost:5001/api';

export const getRestaurants = async () => {
    const response = await fetch(`${API_URL}/restaurants`);
    return response.json();
};

export const saveRestaurant = async (data) => {
    const response = await fetch(`${API_URL}/restaurants`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    return response.json();
};